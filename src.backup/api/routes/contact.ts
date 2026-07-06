import express from 'express';
import { Lead, Settings, UsageStats, Client, Contact } from '../models';
import { sendEmail } from '../email';
import { EnvelopeResponse } from '../middlewares/envelope';
import { resolveClientId } from '../utils/resolveClient';

const router = express.Router();

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  try {
    const { name, email, phone, subject, message, preferredContactMethod } = req.body;
    
    const clientId = await resolveClientId(req);
    console.log('[DEBUG] [Contact] Received body:', req.body, 'Resolved clientId:', clientId);

    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'Target client could not be identified');

    const ip = (req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '').split(',')[0].trim();
    let location = { ip, city: 'Unknown', country: 'Unknown' };
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = { ip, city: geoData.city, country: geoData.country };
      }
    } catch (e) {}

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) usage = await UsageStats.create({ clientId, month: currentMonth });

    const clientRecord = await Client.findOne({ clientId });
    let storageLimit = clientRecord?.storageLimitBytes || 52428800;

    if (usage.storageBytesUsed >= storageLimit) {
      return envRes.sendError(401, 'QUOTA_EXCEEDED', 'Storage Limit reached. Cannot accept new messages right now.');
    }

    const nameParts = (name || '').trim().split(' ');
    const contactFirst = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : name;
    const contactLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    const settings = await Settings.findOne({ clientId });

    if (settings) {
      sendEmail(
        settings.contactEmail,
        `New Inquiry: ${subject || 'No Subject'}`,
        `From: ${name}\nEmail: ${email}\nPhone: ${phone}\nPrefers: ${preferredContactMethod}\n\nMessage:\n${message}`,
        undefined,
        clientId
      );
      
      const businessName = settings.businessName || 'our team';
      sendEmail(
        email,
        `Message Received - ${businessName}`,
        `Hello ${name},\n\nWe received your message and will get back to you shortly.\n\nThank you,\n${businessName}`,
        undefined,
        clientId
      );
    }
    
    // Save to Contact model for Inquiries View
    await Contact.create({
      clientId,
      name,
      email,
      phone,
      subject: subject || 'General Inquiry',
      message,
      preferredContactMethod,
      location,
      status: 'unread'
    });

    // Sync to Leads logic
    let savedLead = null;
    try {
      const criteria: any = { clientId };
      const or = [];
      if (email) or.push({ contactEmail: email.toLowerCase().trim() });
      if (phone) or.push({ contactPhone: phone.trim() });
      
      let existingLead = null;
      if (or.length > 0) existingLead = await Lead.findOne({ ...criteria, $or: or });

      if (existingLead) {
        existingLead.lastActivity = new Date();
        const tags = new Set([...(existingLead.tags || []), 'inquiry']);
        existingLead.tags = Array.from(tags);
        if (location) existingLead.location = location;
        const existingData = existingLead.data instanceof Map ? Object.fromEntries(existingLead.data) : (existingLead.data || {});
        existingLead.data = { ...existingData, lastContactMessage: message, subject, preferredContactMethod };
        
        existingLead.activities.push({
           type: 'email',
           description: `Submitted inquiry: ${subject || 'No Subject'}`,
           date: new Date(),
           metadata: { message }
        });
        
        await existingLead.save();
        savedLead = existingLead;
      } else {
        savedLead = await Lead.create({
          clientId,
          contactFirst: contactFirst || 'Unknown',
          contactLast: contactLast || '',
          contactEmail: email,
          contactPhone: phone,
          source: 'contact',
          tags: ['inquiry'],
          stage: 'New',
          location,
          lastActivity: new Date(),
          data: { lastContactMessage: message, subject, preferredContactMethod },
          activities: [{
             type: 'email',
             description: `Submitted inquiry: ${subject || 'No Subject'}`,
             date: new Date(),
             metadata: { message }
          }]
        });
      }
    } catch (err) {
      console.warn('[LEAD-SYNC] Failed to sync contact to lead:', err);
    }

    envRes.sendSuccess(savedLead);
  } catch (error: any) {
    console.error('[CONTACT_ROUTE_ERROR]', error);
    if (error.name === 'ValidationError') {
      return envRes.sendError(400, 'VALIDATION_ERROR', Object.values(error.errors).map((e: any) => e.message).join(', '));
    }
    envRes.sendError(500, 'SERVER_ERROR', 'Contact submission failed: ' + (error.message || 'Unknown error'));
  }
});

export default router;
