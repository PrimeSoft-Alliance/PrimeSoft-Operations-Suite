import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Client, Settings, UsageStats, Booking, Contact, OnboardingLink } from '../models';
import { superAdminMiddleware } from '../auth';

const router = express.Router();

router.use(superAdminMiddleware);

// Get all clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await Client.find({ role: 'client' }).select('-password');
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// AI Prompt Generator (Moved from ai.ts as requested)
router.get('/builder-prompt/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const settings = await Settings.findOne({ clientId });
    if (!settings) return res.status(404).json({ error: 'Settings not found' });

    const prompt = `
Build a modern, high-converting React website for a business called "${settings.businessName}". 
Business Overview: ${settings.aboutText || 'A professional service provider focusing on quality and customer satisfaction.'}
Contact Point: ${settings.contactPhone}, ${settings.contactEmail}.

SERVICES & SOLUTIONS:
${settings.services.length > 0 ? settings.services.map((s: any) => `- ${s.name}: ${s.description}`).join('\n') : '- Contact us for specific services.'}

TECHNICAL REQUIREMENTS:
1. Add this script tag in your index.html/head: <script src="${req.headers.origin || ('https://' + req.get('host'))}/platform-sdk.js"></script>
2. For the Booking Form, add the attribute [data-platform="booking"] to the <form> tag. 
   Input names: fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, notes.
3. For the Contact Form, add the attribute [data-platform="contact"] to the <form> tag. 
   Input names: name, email, phone, message, preferredContactMethod.
4. Add [data-platform-field="heroTitle"] to your hero title element, etc. to sync CMS fields.
5. Use a ${settings.branding?.layoutStyle || 'modern'} aesthetic with ${settings.branding?.primaryColor || '#2563eb'} as primary color.
    `.trim();

    res.json({ prompt });
  } catch (err) {
    res.status(500).json({ error: 'Prompt generation failed' });
  }
});

// Generate Onboarding Link
router.post('/generate-onboarding-link', async (req, res) => {
  try {
    const { clientId, expiryHours = 24 } = req.body;
    
    if (!clientId) return res.status(400).json({ error: 'Client ID is required' });

    // Clean up any existing unused/expired links for this ID
    await OnboardingLink.deleteMany({ clientId, isUsed: false });

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + Number(expiryHours));

    await OnboardingLink.create({
      clientId,
      token,
      expiresAt
    });

    const fullUrl = `${req.headers.origin}/onboarding/${token}`;
    res.json({ success: true, url: fullUrl, expiresAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate link' });
  }
});

// Create new client
router.post('/clients', async (req, res) => {
  try {
    const { clientId, businessName, email, password, aiMessageLimit, storageLimitBytes, customDomain } = req.body;
    
    const existing = await Client.findOne({ $or: [{ clientId }, { email }, { customDomain: customDomain || 'never-match-this' }] });
    if (existing) return res.status(400).json({ error: 'Client ID, Email, or Domain already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const client = await Client.create({
      clientId,
      businessName,
      email,
      password: hash,
      aiMessageLimit,
      storageLimitBytes,
      customDomain
    });

    // Initialize settings
    await Settings.create({
      clientId,
      businessName,
      contactEmail: email,
      workingHours: Array.from({ length: 7 }, (_, i) => ({
        day: i,
        isOpen: i > 0 && i < 6,
        openTime: '08:00',
        closeTime: '17:00'
      }))
    });

    res.json({ success: true, client: { clientId, businessName, email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin stats
router.get('/stats', async (req, res) => {
  try {
    const totalClients = await Client.countDocuments({ role: 'client' });
    const totalBookings = await Booking.countDocuments();
    const totalContacts = await Contact.countDocuments();
    
    res.json({
      totalClients,
      totalBookings,
      totalContacts
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update client
router.put('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { aiMessageLimit, storageLimitBytes, status } = req.body;
    
    await Client.findOneAndUpdate({ clientId }, {
      aiMessageLimit,
      storageLimitBytes,
      status
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete client
router.delete('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    await Client.deleteOne({ clientId });
    await Settings.deleteOne({ clientId });
    await Booking.deleteMany({ clientId });
    await Contact.deleteMany({ clientId });
    await UsageStats.deleteMany({ clientId });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
