import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import bcrypt from 'bcryptjs';
import { Booking, Contact, Settings, UsageStats, AILog, Client, Lead } from '../models';
import { authMiddleware } from '../auth';
import { sendEmail } from '../email';

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

  let cid = 'plumber-001';

  // If user is superadmin, prioritize query/header or fallback to plumber-001
  if (req.user?.role === 'superadmin') {
    cid = queryCid || headerCid || 'plumber-001';
  } else {
    // Prefer authenticated user CID, then request CID, then finally fallback
    cid = userCid || reqCid || 'plumber-001';
  }

  (req as any).clientId = cid;
  return cid;
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
    const [totalBookings, pendingBookings, totalContacts, unreadContacts, totalLeads] = await Promise.all([
      Booking.countDocuments({ clientId }),
      Booking.countDocuments({ clientId, status: 'pending' }),
      Contact.countDocuments({ clientId }),
      Contact.countDocuments({ clientId, status: 'unread' }),
      Lead.countDocuments({ clientId })
    ]);
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    
    console.log(`[STATS] Usage for ${clientId}:`, usage);

    const statsData = {
      businessName: client?.businessName || 'Business',
      totalBookings,
      pendingBookings,
      totalContacts,
      unreadContacts,
      totalLeads,
      usage: {
        aiMessagesUsed: usage?.aiMessagesUsed ?? 0,
        aiMessagesLimit: clientId === 'plumber-001' ? 999999999 : (client?.aiMessageLimit ?? 1000),
        storageBytesUsed: usage?.storageBytesUsed ?? 0,
        storageBytesLimit: clientId === 'plumber-001' ? 999999999999 : (client?.storageLimitBytes ?? 52428800)
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
    const { Domain } = await import('../models');
    const { host, type } = req.body;
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
    const [bookings, client] = await Promise.all([
      Booking.find({ clientId: cid }).sort({ createdAt: -1 }),
      Client.findOne({ clientId: cid })
    ]);
    envRes.sendSuccess(bookings, { clientId: cid, businessName: client?.businessName });
  } catch (error) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

router.patch('/bookings/:id/status', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    envRes.sendSuccess(booking);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

// Contacts
router.get('/contacts', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const cid = getCid(req);
    const [contacts, client] = await Promise.all([
      Contact.find({ clientId: cid }).sort({ createdAt: -1 }),
      Client.findOne({ clientId: cid })
    ]);
    envRes.sendSuccess(contacts, { clientId: cid, businessName: client?.businessName });
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

router.patch('/contacts/:id/status', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { status } = req.body;
    const contact = await Contact.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    envRes.sendSuccess(contact);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

// Settings
router.get('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    let settings = await Settings.findOne({ clientId: getCid(req) });
    envRes.sendSuccess(settings);
  } catch (e) { envRes.sendError(500, 'API_ERROR', 'Failed'); }
});

router.put('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const update = req.body;
    const clientId = getCid(req);
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

export default router;
