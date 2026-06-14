import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import bcrypt from 'bcryptjs';
import { Booking, Contact, Settings, UsageStats, AILog, Client, Lead, AuditLog } from '../models';
import { authMiddleware } from '../auth';
import { sendEmail } from '../email';
import { startOfDay, format } from 'date-fns';

import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

const router = express.Router();

router.use(authMiddleware);

// Theme Upload
router.post('/upload-theme', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = (req as any).user.clientId;
    const { zipBase64 } = req.body;
    
    if (!zipBase64) return envRes.sendError(400, 'API_ERROR', 'No zip data provided');

    const themeDir = path.join(process.cwd(), 'themes', clientId);
    if (!fs.existsSync(themeDir)) {
      fs.mkdirSync(themeDir, { recursive: true });
    }

    const zipBuffer = Buffer.from(zipBase64, 'base64');
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(themeDir, true);

    await Settings.findOneAndUpdate({ clientId }, { hasCustomTheme: true });

    envRes.sendSuccess({ message: 'Theme uploaded and extracted successfully'  });
  } catch (error) {
    console.error('Theme Upload Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Upload failed', String(error));
  }
});

// Image Upload
router.post('/upload-image', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64) return envRes.sendError(400, 'API_ERROR', 'No image data');

    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = fileName ? path.extname(fileName) : '.jpg';
    const uniqueName = `img_${Date.now()}${ext}`;
    const filePath = path.join(process.cwd(), 'uploads', uniqueName);

    fs.writeFileSync(filePath, buffer);

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const url = `${protocol}://${host}/uploads/${uniqueName}`;

    envRes.sendSuccess({ url  });
  } catch (error) {
    console.error('Image Upload Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Upload failed');
  }
});

// Helper to get clientId
const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  const queryCid = req.query.clientId;
  const headerCid = req.headers['x-client-id'];

  let cid = userCid || reqCid || headerCid || queryCid;

  if (!cid) return null;

  (req as any).clientId = String(cid);
  return String(cid);
};

// Test SMTP
router.post('/test-email', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { email, smtp } = req.body;
    if (!email) return envRes.sendError(400, 'API_ERROR', 'Recipient email required');
    
    // For test-email, we use the sender settings from body if provided, 
    // otherwise we use the ones from the database for the current clientId
    const result = await sendEmail(
      email, 
      'SMTP Test Connection', 
      'If you received this, your SMTP settings are working correctly!', 
      undefined, 
      getCid(req),
      smtp
    );
    if (result.success) {
      envRes.sendSuccess({ message: 'Test email sent. Please check your inbox (and spam folder).'  });
    } else {
      envRes.sendError(500, 'SMTP_FAILED', 'SMTP Authentication Failed', result.error);
    }
  } catch (error) {
    console.error('SMTP Test Error:', error);
    envRes.sendError(500, 'API_ERROR', 'API Error during testing', error instanceof Error ? error.message : String(error));
  }
});

// Setup
router.get('/stats', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    const client = await Client.findOne({ clientId });
    
    // Fetch data points for overview
    const [totalBookings, pendingBookings, totalLeads, unreadContacts, totalContacts] = await Promise.all([
      Booking.countDocuments({ clientId }),
      Booking.countDocuments({ clientId, status: 'pending' }),
      Lead.countDocuments({ clientId }),
      Contact.countDocuments({ clientId, status: 'unread' }),
      Contact.countDocuments({ clientId })
    ]);
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return d;
    });

    const chartData = await Promise.all(last7Days.map(async (day) => {
      const start = startOfDay(day);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      
      const [bookings, leads, contacts, chats] = await Promise.all([
        Booking.countDocuments({ clientId, createdAt: { $gte: start, $lte: end } }),
        Lead.countDocuments({ clientId, createdAt: { $gte: start, $lte: end } }),
        Contact.countDocuments({ clientId, createdAt: { $gte: start, $lte: end } }),
        AILog.countDocuments({ clientId, role: 'user', createdAt: { $gte: start, $lte: end } })
      ]);

      return {
        name: format(day, 'MMM dd'),
        interactions: chats + contacts,
        conversion: bookings + leads
      };
    }));

    const statsData = {
      businessName: client?.businessName || 'Business',
      totalBookings,
      pendingBookings,
      totalContacts,
      unreadContacts,
      totalLeads,
      chartData,
      usage: {
        aiMessagesUsed: usage?.aiMessagesUsed ?? 0,
        aiMessagesLimit: client?.aiMessageLimit ?? 1000,
        storageBytesUsed: usage?.storageBytesUsed ?? 0,
        storageBytesLimit: client?.storageLimitBytes ?? 52428800
      }
    };
    
    console.log(`[STATS] StatsData:`, statsData);

    envRes.sendSuccess(statsData, { clientId, businessName: client?.businessName });
  } catch (error) {
    console.error('[DASHBOARD STATS] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to load dashboard statistics');
  }
});

// Domains
router.get('/domains', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { Domain } = await import('../models');
    const domains = await Domain.find({ clientId: getCid(req) });
    envRes.sendSuccess(domains);
  } catch (err) { envRes.sendError(500, 'API_ERROR', 'Failed to fetch domains'); }
});

router.post('/domains', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { Domain, PlatformSettings } = await import('../models');
    const { host, type } = req.body;
    
    // Check if subdomains are restricted
    if (type === 'subdomain') {
       const pSettings = null;
       if (pSettings?.restrictSubdomains) {
          return envRes.sendError(403, 'RESTRICTED', 'Platform policy restricts creation of new subdomains at this time.');
       }
    }

    const domain = await Domain.create({ 
      clientId: getCid(req), 
      host, 
      type: type || 'custom-domain',
      status: 'pending'
    });
    envRes.sendSuccess(domain);
  } catch (err) { envRes.sendError(400, 'API_ERROR', 'Domain already exists or invalid'); }
});

router.delete('/domains/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
    try {
      const { Domain } = await import('../models');
      await Domain.findOneAndDelete({ _id: req.params.id, clientId: getCid(req) });
      envRes.sendSuccess({ success: true });
    } catch (err) { envRes.sendError(500, 'API_ERROR', 'Delete failed'); }
});

// Bookings
router.get('/bookings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const cid = getCid(req);
    const [bookings, leads, client] = await Promise.all([
      Booking.find({ clientId: cid }).sort({ createdAt: -1 }).lean(),
      Lead.find({ clientId: cid }).lean(),
      Client.findOne({ clientId: cid })
    ]);
    
    // Enrich each booking with matched lead attributes if present
    const enrichedBookings = bookings.map((booking: any) => {
      const emailLower = booking.email ? String(booking.email).toLowerCase().trim() : '';
      const phoneClean = booking.phoneNumber ? String(booking.phoneNumber).replace(/\D/g, '') : '';
      
      const matchedLead = leads.find((l: any) => {
        const leadEmail = l.contactEmail ? String(l.contactEmail).toLowerCase().trim() : '';
        const leadPhone = l.contactPhone ? String(l.contactPhone).replace(/\D/g, '') : '';
        return (emailLower && leadEmail === emailLower) || 
               (phoneClean && leadPhone === phoneClean) || 
               (l.data?.bookingId && String(l.data.bookingId) === String(booking._id));
      });
      
      if (matchedLead) {
        return {
          ...booking,
          leadId: matchedLead._id,
          leadStage: matchedLead.stage,
          leadScore: matchedLead.score,
          leadTags: matchedLead.tags,
          leadActivities: matchedLead.activities,
          leadData: matchedLead.data,
          assignedTo: matchedLead.assignedTo
        };
      }
      return booking;
    });

    envRes.sendSuccess(enrichedBookings, { clientId: cid, businessName: client?.businessName });
  } catch (error) { 
    console.error('[BOOKINGS_FETCH] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch bookings'); 
  }
});

router.patch('/bookings/:id/status', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    envRes.sendSuccess(booking);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

// Settings
router.get('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = getCid(req);
    let settings = await Settings.findOne({ clientId });
    let client = await Client.findOne({ clientId });
    
    let combined = settings ? settings.toObject() : {};
    if (client) {
      combined.telegramBotToken = client.telegramBotToken;
      combined.whatsappBusinessAccountId = client.whatsappBusinessAccountId;
      combined.whatsappAccessToken = client.whatsappAccessToken;
    }
    
    envRes.sendSuccess(combined);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

router.put('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const update = req.body;
    const clientId = getCid(req);
    
    // Extract bot integration fields from settings update and apply to Client
    const botUpdates: any = {};
    if (update.telegramBotToken !== undefined) {
      botUpdates.telegramBotToken = update.telegramBotToken;
      delete update.telegramBotToken;
      
      // Attempt to register webhook
      if (botUpdates.telegramBotToken) {
        try {
          const axios = require('axios');
          const baseUrl = process.env.APP_URL || ('https://' + req.get('host'));
          await axios.post(`https://api.telegram.org/bot${botUpdates.telegramBotToken}/setWebhook`, {
            url: `${baseUrl}/v1/telegram/webhook/${clientId}`
          });
          console.log(`Telegram webhook registered for ${clientId}`);
        } catch (err: any) {
          console.error(`Failed to register Telegram webhook for ${clientId}:`, err.response?.data || err.message);
        }
      }
    }
    if (update.whatsappPhoneNumberId !== undefined) {
      botUpdates.whatsappPhoneNumberId = update.whatsappPhoneNumberId;
      delete update.whatsappPhoneNumberId;
    }
    if (update.whatsappBusinessAccountId !== undefined) {
      botUpdates.whatsappBusinessAccountId = update.whatsappBusinessAccountId;
      delete update.whatsappBusinessAccountId;
    }
    if (update.whatsappAccessToken !== undefined) {
      botUpdates.whatsappAccessToken = update.whatsappAccessToken;
      delete update.whatsappAccessToken;
    }

    if (Object.keys(botUpdates).length > 0) {
      await Client.updateOne({ clientId }, { $set: botUpdates });
    }

    const settings = await Settings.findOneAndUpdate(
      { clientId },
      { $set: { ...update, clientId } },
      { new: true, upsert: true }
    );
    envRes.sendSuccess(settings);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

router.post('/security', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { email, password } = req.body;
    const clientId = getCid(req);
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    await Client.findOneAndUpdate({ clientId }, { email, password: hash });
    envRes.sendSuccess({ success: true });
  } catch (e) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update security');
  }
});

router.post('/logs', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { PlatformSettings } = await import('../models');
    const pSettings = null;
    
    const { action, target, metadata } = req.body;
    
    if (pSettings?.detailedAuditLogging === false) {
       // Filter non-critical logs
       const criticalActions = ['UPDATE_SECURITY', 'UPDATE_SETTINGS', 'DELETE_DOMAIN'];
       if (!criticalActions.includes(action)) {
         return envRes.sendSuccess({ skipped: true, reason: 'Detailed logging disabled' });
       }
    }

    const clientId = getCid(req);
    const actor = (req as any).user?.email || clientId || 'client-operator';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const log = await AuditLog.create({
      actor,
      action,
      target: target || clientId,
      metadata: {
        ...metadata,
        clientId
      },
      ip: typeof ip === 'string' ? ip : undefined
    });

    envRes.sendSuccess(log);
  } catch (e) {
    envRes.sendError(500, 'API_ERROR', 'Failed to write audit log');
  }
});

// Contacts / Inquiries
router.get('/contacts', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const cid = getCid(req);
    const [contacts, leads] = await Promise.all([
      Contact.find({ clientId: cid }).sort({ createdAt: -1 }).lean(),
      Lead.find({ clientId: cid }).lean()
    ]);
    
    // Enrich with lead metrics
    const enrichedContacts = contacts.map((contact: any) => {
      const emailLower = contact.email ? String(contact.email).toLowerCase().trim() : '';
      const phoneClean = contact.phone ? String(contact.phone).replace(/\D/g, '') : '';
      
      const matchedLead = leads.find((l: any) => {
        const leadEmail = l.contactEmail ? String(l.contactEmail).toLowerCase().trim() : '';
        const leadPhone = l.contactPhone ? String(l.contactPhone).replace(/\D/g, '') : '';
        return (emailLower && leadEmail === emailLower) || 
               (phoneClean && leadPhone === phoneClean) ||
               (l.data?.contactId && String(l.data.contactId) === String(contact._id));
      });
      
      if (matchedLead) {
        return {
          ...contact,
          leadId: matchedLead._id,
          leadStage: matchedLead.stage,
          leadScore: matchedLead.score,
          leadTags: matchedLead.tags,
          leadActivities: matchedLead.activities,
          leadData: matchedLead.data,
          assignedTo: matchedLead.assignedTo
        };
      }
      return contact;
    });

    envRes.sendSuccess(enrichedContacts);
  } catch (error) { 
    console.error('[CONTACTS_FETCH] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch contacts'); 
  }
});

router.patch('/contacts/:id/status', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { status } = req.body;
    const contact = await Contact.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    envRes.sendSuccess(contact);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed update'); }
});

router.put('/bookings/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    envRes.sendSuccess(booking);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

export default router;
