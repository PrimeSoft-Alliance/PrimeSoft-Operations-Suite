import express from 'express';
import { Contact, Settings, UsageStats, Client } from '../models';
import { sendEmail } from '../email';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const { name, email, phone, subject, message, preferredContactMethod, clientId: bodyClientId } = req.body;
    let clientId = bodyClientId || req.headers['x-client-id'] || (req as any).clientId;

    // Fix: Ensure clientId is a string if it was passed as an object
    if (typeof clientId === 'object' && clientId !== null && 'clientId' in clientId) {
      clientId = (clientId as any).clientId;
    }
    clientId = String(clientId);

    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is required');

    // Fetch Geo Location
    const ip = (req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '').split(',')[0].trim();
    let location = { ip, city: 'Unknown', country: 'Unknown' };
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = { ip, city: geoData.city, country: geoData.country };
      }
    } catch (e) { console.warn('[GEO] Failed to fetch IP geo:', e); }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) usage = await UsageStats.create({ clientId, month: currentMonth });

    const clientRecord = await Client.findOne({ clientId });
    let storageLimit = clientRecord?.storageLimitBytes || 52428800;

    if (usage.storageBytesUsed >= storageLimit) {
      return envRes.sendError(403, 'QUOTA_EXCEEDED', 'Storage Limit reached. Cannot accept new messages right now.');
    }

    const contact = await Contact.create({
      clientId,
      name, email, phone, subject, message, preferredContactMethod,
      location
    });

    const settings = await Settings.findOne({ clientId });

    if (settings) {
      sendEmail(
        settings.contactEmail,
        `New Contact Message: ${subject || 'No Subject'}`,
        `From: ${name}\nEmail: ${email}\nPhone: ${phone}\nPrefers: ${preferredContactMethod}\n\nMessage:\n${message}`,
        undefined,
        clientId
      );
    }

    const businessName = settings?.businessName || 'our team';
    sendEmail(
      email,
      `Message Received - ${businessName}`,
      `Hello ${name},\n\nWe received your message and will get back to you shortly.\n\nThank you,\n${businessName}`,
      undefined,
      clientId
    );

    // Sync to Leads immediately
    try {
      const { Lead } = await import('../models');
      const [first, ...lastParts] = (name || '').split(' ');
      
      const criteria: any = { clientId };
      const or = [];
      if (email) or.push({ contactEmail: email.toLowerCase().trim() });
      if (phone) or.push({ contactPhone: phone.trim() });
      
      let lead = null;
      if (or.length > 0) lead = await Lead.findOne({ ...criteria, $or: or });

      if (lead) {
        lead.lastActivity = new Date();
        const tags = new Set([...(lead.tags || []), 'from contact']);
        lead.tags = Array.from(tags);
        if (location) lead.location = location;
        const existingData = lead.data instanceof Map ? Object.fromEntries(lead.data) : (lead.data || {});
        lead.data = { ...existingData, lastContactMessage: message, contactRef: contact._id };
        await lead.save();
      } else {
        await Lead.create({
          clientId,
          contactFirst: first || 'Unknown',
          contactLast: lastParts.join(' ') || '',
          contactEmail: email,
          contactPhone: phone,
          source: 'contact',
          tags: ['from contact', 'auto-synced'],
          status: 'new',
          location,
          lastActivity: new Date(),
          data: { lastContactMessage: message, contactRef: contact._id }
        });
      }
    } catch (err) {
      console.warn('[LEAD-SYNC] Failed to sync contact to lead:', err);
    }

    envRes.sendSuccess(contact);
  } catch (error) {
    envRes.sendError(500, 'SERVER_ERROR', 'Contact submission failed');
  }
});

export default router;
