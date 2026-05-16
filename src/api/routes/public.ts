import express from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Settings, Booking, Contact, Invite, Client, Domain, UsageStats } from '../models';
import { sendEmail } from '../email';
import { startOfDay, addMinutes, format } from 'date-fns';

const router = express.Router();

// Domain Resolution & Headless Config
router.get('/headless/config', async (req, res) => {
  try {
    const host = req.query.host || req.hostname;
    // Check Domain mappings first
    let domain = await Domain.findOne({ host: host.toString(), status: 'active' });
    let clientId = domain?.clientId;

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
      return res.status(404).json({ error: 'Tenant not resolved for host: ' + host });
    }

    const [client, settings] = await Promise.all([
      Client.findOne({ clientId }),
      Settings.findOne({ clientId })
    ]);

    if (!client || !settings) {
      return res.status(404).json({ error: 'Client not found' });
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
    res.status(500).json({ error: 'Failed to resolve headless config' });
  }
});

// Get content for headless editing/display
router.get('/:clientId/content', async (req, res) => {
  try {
    const { clientId } = req.params;
    const settings = await Settings.findOne({ clientId });
    if (!settings) return res.status(404).json({ error: 'Settings not found' });

    res.json({
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      heroImage: settings.branding?.heroImage || settings.heroImage,
      aboutText: settings.aboutText,
      aboutImage: settings.aboutImage,
      footerText: settings.footerText,
      services: settings.services,
      portfolio: settings.portfolioProjects,
      stats: settings.clientStats
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Resolve hostname to clientId
router.get('/tenant/resolve', async (req, res) => {
  try {
    const { host } = req.query;
    if (!host) return res.status(400).json({ error: 'Host is required' });

    // Check custom domains collection
    const domain = await Domain.findOne({ host, status: 'active' });
    if (domain) {
      return res.json({ clientId: domain.clientId });
    }

    // Check client subdomain or customDomain
    const client = await Client.findOne({
      $or: [
        { customDomain: host },
        { subdomain: host.toString().split('.')[0] }
      ],
      status: 'active'
    });

    if (client) {
      return res.json({ clientId: client.clientId });
    }

    res.status(404).json({ error: 'Tenant not found' });
  } catch (err) {
    res.status(500).json({ error: 'Resolution failed' });
  }
});

// Get onboarding link details
router.get('/onboarding/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const link = await Invite.findOne({ token, status: 'pending' });
    
    if (!link) return res.status(404).json({ error: 'Link not found or already used' });
    if (new Date() > link.expiresAt) {
      link.status = 'expired';
      await link.save();
      return res.status(400).json({ error: 'Link expired' });
    }

    res.json({ clientId: link.clientId, expiresAt: link.expiresAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

// Submit onboarding form
router.post('/onboarding/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { businessName, businessType, subdomain, email, password, contactPhone, contactEmail, workingHours } = req.body;

    const link = await Invite.findOne({ token, status: 'pending' });
    if (!link || new Date() > link.expiresAt) return res.status(400).json({ error: 'Invalid or expired link' });

    // Create the account/update settings
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const client = await Client.create({
      clientId: link.clientId,
      businessName,
      businessType,
      subdomain,
      email,
      password: hash,
      apiKey: 'psa_live_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    });

    if (subdomain) {
      await Domain.create({
        clientId: link.clientId,
        host: `${String(subdomain).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')}.client.com`,
        type: 'subdomain',
        status: 'active'
      });
    }

    await UsageStats.create({
      clientId: link.clientId,
      month: format(new Date(), 'yyyy-MM'),
      aiMessageCount: 0,
      storageUsedBytes: 0,
    });

    await Settings.create({
      clientId: link.clientId,
      businessName,
      contactPhone,
      contactEmail,
      aboutText: req.body.businessDescription || '',
      workingHours: workingHours || Array.from({ length: 7 }, (_, i) => ({
        day: i,
        isOpen: i > 0 && i < 6,
        openTime: '08:00',
        closeTime: '17:00'
      }))
    });

    link.status = 'used';
    link.onboardedEmail = email;
    await link.save();

    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email or Client ID already in use' });
    res.status(500).json({ error: 'Onboarding failed', message: err.message });
  }
});

// Get settings for external or internal use
router.get('/settings', async (req, res) => {
  try {
    const clientId = req.query.clientId || req.headers['x-client-id'] || 'plumber-001';
    let settings = await Settings.findOne({ clientId });
    if (!settings && clientId === 'plumber-001') {
      // Create defaults for PrimeSoft Alliance
      settings = await Settings.create({
        clientId: 'plumber-001',
        businessName: 'PrimeSoft Alliance',
        heroTitle: 'Empowering Digital Transformation',
        heroSubtitle: 'At PrimeSoft Alliance, we develop, deploy, and manage cutting-edge software solutions.',
        aboutText: 'PrimeSoft Alliance is an information technology solutions company engaged in the development, deployment, and management of software applications, enterprise systems, and digital platforms.',
        services: [
          { id: '1', name: 'Custom Software Development', description: 'Tailored applications built to solve your unique challenges.', price: 2000, durationMinutes: 120 },
          { id: '2', name: 'Cloud Integration', description: 'Modernizing infrastructure for maximum agility and speed.', price: 1500, durationMinutes: 90 }
        ],
        workingHours: Array.from({ length: 7 }, (_, i) => ({
          day: i, isOpen: i > 0 && i < 6, openTime: '08:00', closeTime: '17:00'
        }))
      });
    }

    // Auto-clean if dummy data exists in existing settings
    if (settings && clientId === 'plumber-001') {
      let needsUpdate = false;
      const lowerBusiness = settings.businessName?.toLowerCase() || '';
      const lowerAbout = settings.aboutText?.toLowerCase() || '';
      
      if (lowerBusiness.includes('plumber') || lowerBusiness.includes('plumbing') || lowerBusiness.includes('us plumber')) {
        settings.businessName = 'PrimeSoft Alliance';
        needsUpdate = true;
      }
      
      const hasPlumbingService = settings.services.some((s: any) => 
        s.name?.toLowerCase().includes('plumbing') || 
        s.name?.toLowerCase().includes('plumber') ||
        s.name?.toLowerCase().includes('water heater') ||
        s.name?.toLowerCase().includes('drain')
      );

      if (hasPlumbingService || settings.services.length === 0) {
        settings.services = [
          { id: '1', name: 'Custom Software Development', description: 'Tailored applications built to solve your unique challenges.', price: 2000, durationMinutes: 120 },
          { id: '2', name: 'Cloud Integration', description: 'Modernizing infrastructure for maximum agility and speed.', price: 1500, durationMinutes: 90 },
          { id: '3', name: 'Mobile App Solutions', description: 'Transforming ideas into high-performance mobile applications.', price: 2500, durationMinutes: 150 },
          { id: '4', name: 'AI & Data Strategy', description: 'Leveraging data to drive intelligent business decisions.', price: 3000, durationMinutes: 120 }
        ];
        needsUpdate = true;
      }

      if (settings.heroTitle?.toLowerCase().includes('plumbing') || settings.heroTitle?.toLowerCase().includes('plumber')) {
        settings.heroTitle = 'Empowering Digital Transformation';
        needsUpdate = true;
      }

      if (lowerAbout.includes('plumbing') || lowerAbout.includes('plumber')) {
        settings.aboutText = 'PrimeSoft Alliance is an information technology solutions company engaged in the development, deployment, and management of software applications, enterprise systems, and digital platforms.';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log(`[Auto-Clean] Pruned plumbing remnants from clientId: ${clientId}`);
        await settings.save();
      }
    }
    if (!settings) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({
      ...settings.toObject(),
      // Flatten common branding fields for SDK simplicity
      heroTitle: settings.heroTitle || settings.branding?.heroTitle,
      heroSubtitle: settings.heroSubtitle || settings.branding?.heroSubtitle,
      aboutText: settings.aboutText || settings.branding?.aboutText,
      primaryColor: settings.primaryColor || settings.branding?.primaryColor,
      fontFamily: settings.fontFamily || settings.branding?.fontFamily,
      heroImage: settings.branding?.heroImage
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Public Booking Submission (for external sites)
router.post('/booking', async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] || 'plumber-001';
    const client = await Client.findOne({ clientId });
    if (!client || client.status === 'suspended') {
      return res.status(403).json({ error: 'This business is currently not accepting bookings.' });
    }
    const { fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, notes } = req.body;

    const settings = await Settings.findOne({ clientId });
    if (!settings) return res.status(404).json({ error: 'Client not found' });

    const selectedService = settings.services.find((s: any) => s.name === serviceSelection);
    const duration = selectedService?.durationMinutes || settings.slotDurationMinutes || 60;
    
    const startDate = new Date(preferredDate);
    const startParts = preferredStartTime.split(':').map(Number);
    startDate.setHours(startParts[0], startParts[1], 0, 0);
    
    const endTimeDate = addMinutes(startDate, duration);
    const preferredEndTime = format(endTimeDate, 'HH:mm');

    const booking = await Booking.create({
      clientId,
      fullName, phoneNumber, email, serviceSelection,
      preferredDate: startOfDay(startDate),
      preferredStartTime, preferredEndTime, notes,
      status: 'pending'
    });

    sendEmail(settings.contactEmail, 'External Booking Received', `New booking: ${fullName}\nService: ${serviceSelection}`);
    sendEmail(email, 'Booking Request Received', `Hello ${fullName}, your booking has been received.`);

    res.json({ success: true, bookingId: booking._id });
  } catch (err: any) {
    res.status(500).json({ error: 'Booking failed', message: err.message });
  }
});

// Public Contact Submission (for external sites)
router.post('/contact', async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] || 'plumber-001';
    const client = await Client.findOne({ clientId });
    if (!client || client.status === 'suspended') {
      return res.status(403).json({ error: 'This business is currently not accepting messages.' });
    }
    const { name, email, phone, message, preferredContactMethod } = req.body;

    const settings = await Settings.findOne({ clientId });
    if (!settings) return res.status(404).json({ error: 'Client not found' });

    const contact = await Contact.create({
      clientId, name, email, phone, message, preferredContactMethod
    });

    sendEmail(settings.contactEmail, 'New Website Message', `From: ${name} (${email})\n\n${message}`);
    sendEmail(email, 'Message Received', `Hello ${name}, thank you for reaching out. We'll be in touch soon.`);

    res.json({ success: true, contactId: contact._id });
  } catch (err: any) {
    res.status(500).json({ error: 'Message failed', message: err.message });
  }
});

export default router;
