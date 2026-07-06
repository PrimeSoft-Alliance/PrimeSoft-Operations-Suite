import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Settings, Booking, Contact, Client, UsageStats, Lead, Visit } from '../models';
import { sendEmail } from '../email';
import { upsertLead } from '../leads';
import { startOfDay, addMinutes, format } from 'date-fns';
import { telnyxService } from '../services/telnyxService';

import { resolveClientId } from '../utils/resolveClient';

const router = express.Router();

// Helper to fetch geo-location from IP
async function getGeoLocation(ip: string) {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return { ip, city: 'Local', country: 'Local', region: 'Local' };
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await res.json();
    if (data.status === 'success') {
      return {
        ip: data.query,
        city: data.city,
        country: data.country,
        region: data.regionName
      };
    }
  } catch (err) {
    console.warn('[GEO] Failed to fetch location:', err);
  }
  return { ip, city: 'Unknown', country: 'Unknown', region: 'Unknown' };
}

// Domain Resolution & Headless Config
router.get('/headless/config', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const host = req.query.host || req.hostname;
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    let clientId;

    if (apiKey) {
      const client = await Client.findOne({ apiKey });
      clientId = client?.clientId;
    }

    if (!clientId) {
      // Fallback: check subdomains or customDomain in Client model
      const client = await Client.findOne({
        $or: [
          { customDomain: host },
          { subdomain: host.toString().split('.')[0] }
        ],
        status: 'active'
      });
      clientId = client?.clientId;
    }

    if (!clientId) {
      return envRes.sendError(404, 'API_ERROR', 'Tenant not resolved for host: ' + host);
    }

    const [client, settings] = await Promise.all([
      Client.findOne({ clientId }),
      Settings.findOne({ clientId })
    ]);

    if (!client || !settings) {
      return envRes.sendError(404, 'API_ERROR', 'Client not found');
    }

    // Default features if headlessConfig is missing (backward compatibility)
    const headless = settings.headlessConfig || {
      enabled: true,
      features: { chat: true, booking: true, contact: true, content: false }
    };

    res.json({
      clientId: client.clientId,
      businessName: client.businessName,
      status: client.status,
      headless,
      branding: {
        primaryColor: settings.primaryColor || '#6366f1',
        fontFamily: settings.fontFamily || 'Inter',
      },
      ai: {
        title: settings.chatbotTitle || 'Assistant',
        avatar: settings.chatbotAvatar,
        greeting: settings.chatbotGreeting,
        color: settings.chatbotPrimaryColor || '#6366f1',
        icon: settings.chatbotIcon || 'Cpu'
      }
    });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to resolve headless config');
  }
});

// Get content for headless editing/display (Global legacy settings)
router.get('/content', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Settings not found');

    res.json({
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      aboutText: settings.aboutText,
      footerText: settings.footerText,
      services: settings.services,
      contact: {
        email: settings.contactEmail,
        phone: settings.contactPhone,
        address: settings.address
      }
    });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch content');
  }
});

// Headless CMS: Get Content Items
// Headless CMS: Get SDK Config
router.get('/content/config', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Client settings not found');

    res.json({
      clientId: settings.clientId,
      businessName: settings.businessName,
      headless: {
        enabled: settings.headlessConfig?.enabled ?? true,
        features: settings.headlessConfig?.features ?? {
          chat: true,
          booking: true,
          contact: true,
          content: true
        }
      },
      ai: {
        title: settings.chatbotTitle || settings.businessName || 'Assistant',
        color: settings.chatbotPrimaryColor || '#6366f1',
        greeting: settings.chatbotGreeting || 'Hello! How can I help you today?',
        avatar: settings.chatbotAvatar || ''
      },
      branding: {
        primaryColor: settings.primaryColor || '#2563eb',
        fontFamily: settings.fontFamily || 'Inter'
      }
    });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch SDK config');
  }
});

// Resolve hostname to clientId
router.get('/tenant/resolve', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { host } = req.query;
    if (!host) return envRes.sendError(400, 'API_ERROR', 'Host is required');

    // Check client subdomain or customDomain
    const client = await Client.findOne({
      $or: [
        { customDomain: host },
        { subdomain: host.toString().split('.')[0] }
      ],
      status: 'active'
    });

    if (client) {
      return envRes.sendSuccess({ clientId: client.clientId });
    }

    envRes.sendError(404, 'API_ERROR', 'Tenant not found');
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Resolution failed');
  }
});

// Get settings for external or internal use
router.get('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    let settings = await Settings.findOne({ clientId });
    
    const settingsObj = settings ? settings.toObject() : {};

    const finalSettings = { ...settingsObj };

    envRes.sendSuccess({
      ...finalSettings,
      // Flatten common branding fields for SDK simplicity
      heroTitle: finalSettings.branding?.heroTitle,
      heroSubtitle: finalSettings.branding?.heroSubtitle,
      aboutText: finalSettings.branding?.aboutText,
      primaryColor: finalSettings.branding?.primaryColor,
      fontFamily: finalSettings.branding?.fontFamily,
      chatbotTitle: finalSettings.chatbotTitle || finalSettings.businessName || 'Assistant',
      chatbotSubtitle: finalSettings.chatbotSubtitle || 'Digital Representative'
    });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch settings');
  }
});

// Public Booking Submission (for external sites)
router.post('/booking', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    
    // Ensure client exists and is active
    try {
      await Client.findOneAndUpdate(
        { clientId: 'platform-prime' },
        {
          $setOnInsert: {
            clientId: 'platform-prime',
            businessName: 'Platform Central',
            email: 'central@platform.com',
            password: 'platform_prime_placeholder',
            role: 'client',
            status: 'active'
          }
        },
        { upsert: true }
      );
    } catch (e) {}

    let client = await Client.findOne({ clientId });

    if (!client || client.status === 'suspended') {
      return envRes.sendError(401, 'API_ERROR', 'This business is currently not accepting bookings.');
    }
    const { fullName, email, serviceSelection, preferredDate, preferredStartTime, notes } = req.body;
    const phoneNumber = req.body.phoneNumber || req.body.phone;
    if (!phoneNumber) return envRes.sendError(400, 'VALIDATION_ERROR', 'Phone number is required');

    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Client not found');

    const selectedService = settings.services.find((s: any) => s.name === serviceSelection);
    const duration = selectedService?.durationMinutes || settings.slotDurationMinutes || 60;
    
    const startDate = new Date(preferredDate);
    if (!preferredStartTime) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Missing preferredStartTime');
    }

    const startParts = preferredStartTime.split(':').map(Number);
    startDate.setHours(startParts[0], startParts[1], 0, 0);
    
    const endTimeDate = addMinutes(startDate, duration);
    const preferredEndTime = format(endTimeDate, 'HH:mm');

    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const location = await getGeoLocation(ip.split(',')[0].trim());

    const booking = await Booking.create({
      clientId,
      fullName, phoneNumber, email, serviceSelection,
      preferredDate: startOfDay(startDate),
      preferredStartTime, preferredEndTime, notes,
      status: 'pending',
      location
    });
    
    await upsertLead({
      clientId,
      email,
      phone: phoneNumber,
      name: fullName,
      source: 'booking',
      location,
      data: { 
        lastServiceRequested: serviceSelection,
        bookingId: booking._id,
        preferredDate,
        preferredStartTime
      },
      tags: ['high-intent', 'booking-submission']
    });

    sendEmail(settings.contactEmail || settings.email || 'admin@platform.com', 'External Booking Received', `New booking: ${fullName}\nService: ${serviceSelection}`, undefined, clientId);
    sendEmail(email, 'Booking Request Received', `Hello ${fullName}, your booking has been received.`, undefined, clientId);

    try {
      const { createSystemNotification } = await import('../utils/notifications');
      await createSystemNotification(clientId, {
        title: 'New Appointment Booking',
        message: `${fullName} has requested a booking for ${serviceSelection} on ${preferredDate} at ${preferredStartTime}.`,
        type: 'booking',
        relatedId: booking._id,
        link: '/dashboard/bookings'
      });
    } catch (e) {
      console.error('[BOOKING_NOTIF] Error creating notification:', e);
    }

    envRes.sendSuccess({ bookingId: booking._id  });
  } catch (err: any) {
    console.error(`[BOOKING] Save Error:`, err);
    if (err.name === 'ValidationError') {
      return envRes.sendError(400, 'VALIDATION_ERROR', `Validation Failed: ${Object.values(err.errors).map((e: any) => e.message).join(', ')}`);
    }
    envRes.sendError(500, 'API_ERROR', 'Booking failed' + ': ' + err.message);
  }
});

// Public Contact Submission (for external sites)
router.post('/contact', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const pSettings = null;
    if (pSettings?.allowAnonymousContact === false) {
       // Optional: Block if anonymous is disabled
       // For now just logging or we could enforce auth if needed
    }

    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
    
    // Ensure client exists
    try {
      await Client.findOneAndUpdate(
        { clientId: 'platform-prime' },
        {
          $setOnInsert: {
            clientId: 'platform-prime',
            businessName: 'Platform Central',
            email: 'central@platform.com',
            password: 'platform_prime_placeholder',
            role: 'client',
            status: 'active'
          }
        },
        { upsert: true }
      );
    } catch (e) {}

    let client = await Client.findOne({ clientId });

    if (!client || client.status === 'suspended') {
      return envRes.sendError(401, 'API_ERROR', 'This business is currently not accepting messages.');
    }
    const { name, email, phone, message, preferredContactMethod, subject } = req.body;

    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Client not found');

    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const location = await getGeoLocation(ip.split(',')[0].trim());

    const contact = await Contact.create({
      clientId, name, email, phone, message, preferredContactMethod, subject,
      location
    });

    // Sync to Leads
    await upsertLead({
      clientId,
      email,
      phone,
      name,
      source: 'contact',
      location,
      data: {
        lastMessage: message,
        subject: subject || 'No subject',
        contactId: contact._id
      },
      tags: ['contact-submission']
    });

    sendEmail(settings.contactEmail, 'New Website Message', `From: ${name} (${email})\n\n${message}`, undefined, clientId);
    sendEmail(email, 'Message Received', `Hello ${name}, thank you for reaching out. We'll be in touch soon.`, undefined, clientId);

    try {
      const { createSystemNotification } = await import('../utils/notifications');
      await createSystemNotification(clientId, {
        title: 'New Web Inquiry Message',
        message: `${name} has sent a web inquiry message: "${subject || 'General Inquiry'}"`,
        type: 'alert',
        relatedId: contact._id,
        link: '/dashboard/support'
      });
    } catch (e) {
      console.error('[CONTACT_NOTIF] Error creating notification:', e);
    }

    envRes.sendSuccess({ contactId: contact._id  });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Message failed' + ': ' + err.message);
  }
});


// Check public quota
router.get('/quota-check', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

    const client = await Client.findOne({ clientId });
    if (!client) return envRes.sendError(404, 'API_ERROR', 'Client not found');

    const { getClientQuota } = await import('../services/quotaService');
    const quota = await getClientQuota(clientId);
    
    envRes.sendSuccess({
      tier: client.tier || 'starter',
      aiTokensUsed: quota.aiTokensUsed,
      aiTokensLimit: quota.aiTokensLimit
    });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to check quota: ' + err.message);
  }
});

// Tracking visitor activity
router.post('/track', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

    const { page, route, referrer, sessionId, interactedWithBot } = req.body;
    
    if (!sessionId) return envRes.sendError(400, 'BAD_REQUEST', 'sessionId is required');

    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const location = await getGeoLocation(ip.split(',')[0].trim());

    await Visit.create({
      clientId,
      sessionId,
      page: page || 'Home',
      route: route || '/',
      referrer,
      userAgent: req.headers['user-agent'],
      interactedWithBot: !!interactedWithBot,
      location
    });

    envRes.sendSuccess({ success: true });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Tracking failed: ' + err.message);
  }
});

// Incoming public email routing / webhook (Zoho-style SMTP email integration handler)
router.post('/email/incoming', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { from, to, subject, text, html, fromName } = req.body;
    let clientId = await resolveClientId(req);

    // Try mapping the "to" email address to a client's settings to find the correct business
    if (to) {
      const matchSettings = await Settings.findOne({
        $or: [
          { contactEmail: to.toLowerCase().trim() },
          { email: to.toLowerCase().trim() }
        ]
      });
      if (matchSettings) {
        clientId = matchSettings.clientId;
      }
    }

    if (!clientId) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Unable to resolve business client ID for the incoming email.');
    }

    const fromEmail = (from || '').toLowerCase().trim();
    const subjectStr = subject || '';
    const bodyText = text || '';

    // Step 1: Upsert sender as a Lead (Ensure contact exists in CRM system)
    await upsertLead({
      clientId,
      email: fromEmail,
      phone: '',
      name: fromName || fromEmail.split('@')[0],
      source: 'contact',
      tags: ['email-contact'],
      data: {
        lastSubject: subjectStr,
        channel: 'email'
      }
    });

    const { Ticket, TicketMessage, Contact } = await import('../models');
    const { createSystemNotification } = await import('../utils/notifications');

    // Step 2: Search for an existing ticket reference matching Ticket #xxxxxx (last 6 hex characters of Ticket ID)
    const ticketMatch = subjectStr.match(/Ticket\s*#\s*([a-fA-F0-9]{6,24})/);
    let ticket = null;

    if (ticketMatch) {
      const hex = ticketMatch[1].toLowerCase();
      if (hex.length === 24) {
        ticket = await Ticket.findOne({ _id: hex, clientId });
      } else if (hex.length === 6) {
        const tickets = await Ticket.find({ clientId });
        ticket = tickets.find((t: any) => t._id.toString().slice(-6).toLowerCase() === hex);
      }
    }

    // Step 3: Route correctly
    if (ticket) {
      // It is a REPLY to an existing ticket!
      const messageObj = await TicketMessage.create({
        clientId,
        ticketId: ticket._id,
        senderRole: 'customer',
        senderName: ticket.customerName,
        content: bodyText || '(No text body entered)'
      });

      ticket.status = 'open';
      ticket.hasUnreadMessages = true;
      ticket.updatedAt = new Date();
      await ticket.save();

      // Trigger visual/system notification for the dashboard
      await createSystemNotification(clientId, {
        title: 'New Email Reply on Ticket',
        message: `Reply from ${ticket.customerName} on Ticket #${ticket._id.toString().slice(-6)}: "${subjectStr}"`,
        type: 'alert',
        relatedId: ticket._id,
        link: '/dashboard/tickets'
      });

      return envRes.sendSuccess({ success: true, type: 'ticket-reply', ticketId: ticket._id, messageId: messageObj._id });
    } else {
      // No ticket match found -> Treat as a brand new INQUIRY (stored in Contact collection)
      const contactObj = await Contact.create({
        clientId,
        name: fromName || fromEmail.split('@')[0],
        email: fromEmail,
        subject: subjectStr || 'Business Inquiry',
        message: bodyText || '(No text body entered)',
        preferredContactMethod: 'email',
        status: 'unread',
        source: 'email'
      });

      // Trigger real-time visual notification for agent dashboard
      await createSystemNotification(clientId, {
        title: 'New Inquiry Message',
        message: `New message inquiry via email from ${contactObj.name}: "${contactObj.subject}"`,
        type: 'alert',
        relatedId: contactObj._id,
        link: '/dashboard/support'
      });

      // Send confirmation auto-reply back to customer
      const clientRecord = await Client.findOne({ clientId }).lean();
      const bizName = clientRecord?.businessName || 'Inquiry Team';
      const emailSubject = `Inquiry Message Received - ${bizName}`;
      const emailText = `Hello ${contactObj.name},\n\nThank you for reaching out to us. We have received your inquiry regarding "${contactObj.subject}".\n\nOur team is reviewing your message and will contact you shortly.\n\nBest regards,\nThe team at ${bizName}`;
      const emailHtml = `<p>Hello <strong>${contactObj.name}</strong>,</p><p>Thank you for reaching out to us. We have received your inquiry regarding <strong>"${contactObj.subject}"</strong>.</p><p>Our team is reviewing your message and will contact you shortly.</p><p>Best regards,<br/>The team at <strong>${bizName}</strong></p>`;

      await sendEmail(fromEmail, emailSubject, emailText, emailHtml, clientId);

      return envRes.sendSuccess({ success: true, type: 'new-inquiry', contactId: contactObj._id });
    }
  } catch (err: any) {
    console.error('Incoming email webhook process failed:', err);
    envRes.sendError(500, 'API_ERROR', 'Failed to route incoming email: ' + err.message);
  }
});

export default router;
