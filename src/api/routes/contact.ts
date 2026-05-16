import express from 'express';
import { Contact, Settings, UsageStats, Client } from '../models';
import { sendEmail } from '../email';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, subject, message, preferredContactMethod, clientId: bodyClientId } = req.body;
    const clientId = bodyClientId || req.headers['x-client-id'] || 'plumber-001';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });
    if (!usage) usage = await UsageStats.create({ clientId, month: currentMonth });

    const clientRecord = await Client.findOne({ clientId });
    let storageLimit = clientRecord?.storageLimitBytes || 52428800;

    // Unlimited for super admin
    if (clientId === 'plumber-001') {
      storageLimit = 999999999999;
    }

    if (usage.storageBytesUsed >= storageLimit) {
      return res.status(403).json({ error: 'Storage Limit reached. Cannot accept new messages right now.' });
    }

    const contact = await Contact.create({
      clientId,
      name, email, phone, subject, message, preferredContactMethod
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

    sendEmail(
      email,
      'We received your message',
      `Hello ${name},\n\nWe received your message and will get back to you shortly.\n\nThank you.`,
      undefined,
      clientId
    );

    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Contact submission failed' });
  }
});

export default router;
