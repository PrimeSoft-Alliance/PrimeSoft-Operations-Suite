import express from 'express';
import bcrypt from 'bcryptjs';
import { Settings, Booking, Contact, OnboardingLink, Client } from '../models';
import { sendEmail } from '../email';
import { startOfDay, addMinutes, format } from 'date-fns';

const router = express.Router();

// Get onboarding link details
router.get('/onboarding/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const link = await OnboardingLink.findOne({ token, isUsed: false });
    
    if (!link) return res.status(404).json({ error: 'Link not found or already used' });
    if (new Date() > link.expiresAt) {
      // If expired, delete the clientId too if requested (user said "clientid generated when generating the link will delete")
      // But we should be careful here. For now just mark as expired.
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
    const { businessName, email, password, contactPhone, contactEmail, workingHours } = req.body;

    const link = await OnboardingLink.findOne({ token, isUsed: false });
    if (!link || new Date() > link.expiresAt) return res.status(400).json({ error: 'Invalid or expired link' });

    // Create the account/update settings
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const client = await Client.create({
      clientId: link.clientId,
      businessName,
      email,
      password: hash,
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

    link.isUsed = true;
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
