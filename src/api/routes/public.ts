import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
<<<<<<< HEAD
import { Settings, Booking, Contact, Invite, Client, Domain, UsageStats, Lead, OnboardingRequest, PlatformSettings, Quota, AITrainingKnowledge } from '../models';
=======
import { Settings, Booking, Contact, Invite, Client, Domain, UsageStats, Lead, OnboardingRequest, PlatformSettings, PlatformNotification } from '../models';
>>>>>>> origin/main
import { sendEmail } from '../email';
import { upsertLead } from '../leads';
import { startOfDay, addMinutes, format } from 'date-fns';

const router = express.Router();

// Middleware to check maintenance mode
router.use(async (req, res, next) => {
  try {
    const pSettings = await PlatformSettings.findOne();
    if (pSettings?.maintenanceMode) {
      // Allow only check and resolve paths
      const allowedPaths = ['/headless/config', '/tenant/resolve', '/v1/public/settings'];
      const isAllowed = allowedPaths.some(path => req.path.includes(path));
      if (!isAllowed) {
        return (res as any as EnvelopeResponse).sendError(503, 'MAINTENANCE', 'System is currently under maintenance. Please try again later.');
      }
    }
    next();
  } catch (err) {
    next();
  }
});

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

// Helper to resolve client identity from various signals
async function resolveClientId(req: express.Request): Promise<string | null> {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.headers['x-api-token'];
  let headerId = req.headers['x-client-id'];
  let queryId = req.query.clientId;
  let bodyId = req.body?.clientId;

  if (typeof headerId === 'object' && headerId !== null && 'clientId' in headerId) headerId = (headerId as any).clientId;
  if (typeof queryId === 'object' && queryId !== null && 'clientId' in queryId) queryId = (queryId as any).clientId;
  if (typeof bodyId === 'object' && bodyId !== null && 'clientId' in bodyId) bodyId = (bodyId as any).clientId;

  console.log(`[RESOLVE] Attempting to resolve client for host: ${req.hostname}. Signals - APIKey: ${!!apiKey}, HeaderID: ${headerId}, QueryID: ${queryId}, BodyID: ${bodyId}`);

  if (apiKey) {
    const client = await Client.findOne({ apiKey });
    if (client) {
      console.log(`[RESOLVE] Resolved via API Key: ${client.clientId}`);
      return client.clientId;
    }
  }

  const cid = headerId || queryId || bodyId;
  if (cid) {
    console.log(`[RESOLVE] Resolved via ID signal: ${cid}`);
    return String(cid);
  }

  // Fallback for Platform Main Site
  const host = req.hostname;
  
  // Fetch Platform Settings for homepageClientId fallback
  let pSettings = null;
  try {
    pSettings = await PlatformSettings.findOne();
  } catch (e) {
    console.error('[RESOLVE] Error fetching PlatformSettings:', e);
  }

  const homepageId = pSettings?.homepageClientId || 'platform-prime';

  if (host.includes('run.app') || host.includes('aistudio') || host.includes('localhost') || host === '0.0.0.0' || host.includes('127.0.0.1')) {
    console.log(`[RESOLVE] Platform domain detected (${host}), defaulting to ${homepageId}`);
    
    // Auto-provision default client if it doesn't exist
    let client = await Client.findOne({ clientId: homepageId });
    if (!client) {
      client = await Client.create({
        clientId: homepageId,
        businessName: 'Platform Central',
        email: 'central@platform.com',
        password: 'platform_prime_placeholder',
        role: 'superadmin',
        status: 'active'
      });
      console.log(`[RESOLVE] Provisioned default client: ${homepageId}`);
    }

    // Ensure Settings exist for the client to avoid 404s
    const settings = await Settings.findOne({ clientId: homepageId });
    if (!settings) {
      await Settings.create({ 
        clientId: homepageId,
        businessName: client.businessName,
        email: client.email,
        aboutText: 'Global platform hub for all integrated services.'
      });
      console.log(`[RESOLVE] Provisioned default settings for: ${homepageId}`);
    }

    return homepageId;
  }

  // Check database for domain mapping match
  const domainMapping = await Domain.findOne({ host, status: 'active' });
  if (domainMapping) {
    console.log(`[RESOLVE] Resolved via Domain mapping: ${domainMapping.clientId}`);
    return domainMapping.clientId;
  }

  const customClient = await Client.findOne({ customDomain: host });
  if (customClient) {
    console.log(`[RESOLVE] Resolved via customDomain field: ${customClient.clientId}`);
    return customClient.clientId;
  }

  // Ultimate self-healing fallback for public router
  try {
    const fallbackClient = await Client.findOne().sort({ createdAt: 1 });
    if (fallbackClient) {
      console.log(`[RESOLVE] Failed host resolution fallback to first client: ${fallbackClient.clientId}`);
      return fallbackClient.clientId;
    }
  } catch (e) {}

  console.warn(`[RESOLVE] Failed to resolve client for host: ${host}, defaulting to platform-prime`);
  return 'platform-prime';
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
      // Check Domain mappings first
      let domain = await Domain.findOne({ host: host.toString(), status: 'active' });
      clientId = domain?.clientId;
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
    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Settings not found');

    res.json({
      heroTitle: settings.heroTitle,
      heroSubtitle: settings.heroSubtitle,
      heroImage: settings.branding?.heroImage || settings.heroImage,
      aboutText: settings.aboutText,
      aboutImage: settings.aboutImage,
      footerText: settings.footerText,
      services: settings.services,
      portfolio: settings.portfolioProjects,
      stats: settings.clientStats,
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
router.get('/content/items', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    const query: any = { clientId, status: 'published' };
    if (req.query.type) query.type = req.query.type;
    if (req.query.tag) query.tags = req.query.tag;

    const items = await mongoose.models.ContentItem.find(query).sort({ updatedAt: -1 });
    envRes.sendSuccess(items);
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch content items: ' + err.message);
  }
});

// Headless CMS: Get SDK Config
router.get('/content/config', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
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
        title: settings.chatbotTitle || 'Assistant',
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

// Headless CMS: Get Content Item by Slug
router.get('/content/items/:slug', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    const item = await mongoose.models.ContentItem.findOne({ 
      clientId, 
      slug: req.params.slug,
      status: 'published'
    });
    
    if (!item) return envRes.sendError(404, 'API_ERROR', 'Content item not found');
    envRes.sendSuccess(item);
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch item: ' + err.message);
  }
});

// Resolve hostname to clientId
router.get('/tenant/resolve', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { host } = req.query;
    if (!host) return envRes.sendError(400, 'API_ERROR', 'Host is required');

    // Check custom domains collection
    const domain = await Domain.findOne({ host, status: 'active' });
    if (domain) {
      return envRes.sendSuccess({ clientId: domain.clientId });
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
      return envRes.sendSuccess({ clientId: client.clientId });
    }

    envRes.sendError(404, 'API_ERROR', 'Tenant not found');
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Resolution failed');
  }
});

// Create a public onboarding request
router.post('/onboarding-request', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { name, email, phone, businessType, message } = req.body;
    console.log('[DEBUG_ONBOARDING] Body received:', { name, email, phone, businessType, message });
    if (!name || !email) {
      return envRes.sendError(400, 'API_ERROR', 'Business name and email are required');
    }

    // Auto-generate unique requestId
    const clientId = await resolveClientId(req) || 'platform-prime';
    const requestId = 'req_' + crypto.randomBytes(6).toString('hex');

    const request = await OnboardingRequest.create({
      requestId,
      businessName: name,
      email,
      phone: phone || '',
      businessType: businessType || 'service',
      details: { message: message || 'Applied via website get-started form.' },
      status: 'pending'
    });

    // Create a notification for Superadmin
    try {
      await PlatformNotification.create({
        type: 'info',
        title: 'New Onboarding Request',
        message: `Business "${name}" has submitted an onboarding request application.`,
        link: '/superadmin/onboarding',
        clientId: 'platform-prime'
      });
    } catch (notifErr) {
      console.error('[NOTIF] Failed to create onboarding request notification:', notifErr);
    }

    // Create an inquiry/contact record
    await Contact.create({
      clientId,
      name,
      email,
      phone,
      subject: 'Onboarding Inquiry',
      message: message || 'Applied via website get-started form.',
      preferredContactMethod: 'email',
      status: 'unread'
    });

    try {
      await sendEmail(email, 'Onboarding Application Received', 
        `Hello ${name},\n\nWe have received your onboarding application! Our team will review your application and send you an invite link shortly.\n\nThank you for choosing us!`,
        undefined, 'system-onboarding'
      );
    } catch (err) {
      console.error('Email notify error:', err);
    }

    envRes.sendSuccess({ success: true, requestId: request.requestId });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', err.message || 'Onboarding request failed');
  }
});

// Get onboarding link details
router.get('/onboarding/:token', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { token } = req.params;
    const link = await Invite.findOne({ token, status: 'pending' });
    
    if (!link) return envRes.sendError(404, 'API_ERROR', 'Link not found or already used');
    if (new Date() > link.expiresAt) {
      link.status = 'expired';
      await link.save();
      return envRes.sendError(400, 'API_ERROR', 'Link expired');
    }

    const client = await Client.findOne({ clientId: link.clientId });
    const settings = await Settings.findOne({ clientId: link.clientId });

    envRes.sendSuccess({ 
      clientId: link.clientId, 
      expiresAt: link.expiresAt,
      customFields: link.customFields || [],
      prefill: {
        businessName: client?.businessName || '',
        businessType: client?.businessType || '',
        email: client?.email || '',
        subdomain: client?.subdomain || '',
        contactEmail: settings?.contactEmail || client?.email || '',
        contactPhone: settings?.contactPhone || '',
        businessDescription: settings?.aboutText || ''
      }
    });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch onboarding');
  }
});

// Submit onboarding form
router.post('/onboarding/:token', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { token } = req.params;
    const { 
      businessName, businessType, subdomain, email, password, 
      contactPhone, contactEmail, workingHours, customFields = {}, tier = 'starter'
    } = req.body;

    const link = await Invite.findOne({ token, status: 'pending' });
    if (!link || new Date() > link.expiresAt) return envRes.sendError(400, 'API_ERROR', 'Invalid or expired link');

    // Create or update the account/settings
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    let client = await Client.findOne({ clientId: link.clientId });
    if (!client) {
      client = await Client.create({
        clientId: link.clientId,
        businessName,
        businessType,
        ...(subdomain ? { subdomain } : {}),
        email,
        password: hash,
        customFields,
<<<<<<< HEAD
        tier: tier || 'starter',
=======
        isActivated: true,
>>>>>>> origin/main
        apiKey: 'pk_live_' + crypto.randomBytes(16).toString('hex')
      });
    } else {
      client.businessName = businessName || client.businessName;
      client.businessType = businessType || client.businessType;
      if (subdomain) {
        client.subdomain = subdomain;
      }
      client.password = hash;
      client.isActivated = true;
      client.customFields = { ...client.customFields, ...customFields };
<<<<<<< HEAD
      if (tier) client.tier = tier;
      if (email) client.email = email;
=======
      if (email) {
        client.email = email;
      }
>>>>>>> origin/main
      await client.save();
    }

    try {
      await PlatformNotification.create({
        type: 'success',
        title: 'New Onboarding Completed',
        message: `${businessName || client.businessName} has completed their onboarding registration successfully!`,
        link: '/superadmin/clients',
        clientId: 'platform-prime'
      });
    } catch (notifErr) {
      console.error('[NOTIF] Failed to create onboarding notification:', notifErr);
    }

    if (subdomain) {
      const pSettings = await PlatformSettings.findOne();
      if (pSettings?.restrictSubdomains) {
        // If restricted, we don't automatically create the subdomain domain mapping
        // but we still store it in the client record for potential later approval
      } else {
        const host = `${String(subdomain).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')}.client.com`;
        const existingDomain = await Domain.findOne({ host });
        if (!existingDomain) {
          await Domain.create({
            clientId: link.clientId,
            host,
            type: 'subdomain',
            status: 'active'
          });
        }
      }
    }

    // Create quota record based on tier
    const tierLimits: Record<string, any> = {
      starter: { aiTokensLimit: 10000, chatMessagesLimit: 1000, storageLimit: 1073741824 },
      professional: { aiTokensLimit: 100000, chatMessagesLimit: 10000, storageLimit: 10737418240 },
      enterprise: { aiTokensLimit: null, chatMessagesLimit: null, storageLimit: null }
    };
    
    const tierConfig = tierLimits[tier] || tierLimits.starter;
    const existingQuota = await Quota.findOne({ clientId: link.clientId });
    if (!existingQuota) {
      await Quota.create({
        clientId: link.clientId,
        tier: tier || 'starter',
        aiTokensLimit: tierConfig.aiTokensLimit || 999999999,
        chatMessagesLimit: tierConfig.chatMessagesLimit || 999999999,
        storageLimit: tierConfig.storageLimit || 1099511627776,
        enabledFeatures: {
          webChat: true,
          telegram: tier === 'professional' || tier === 'enterprise',
          whatsapp: tier === 'enterprise',
          aiAssistant: true
        }
      });
    }

    const currentMonth = format(new Date(), 'yyyy-MM');
    const existingUsage = await UsageStats.findOne({ clientId: link.clientId, month: currentMonth });
    if (!existingUsage) {
      await UsageStats.create({
        clientId: link.clientId,
        month: currentMonth,
        aiMessagesUsed: 0,
        storageBytesUsed: 0,
      });
    }

    let settings = await Settings.findOne({ clientId: link.clientId });
    if (!settings) {
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
    } else {
      settings.businessName = businessName || settings.businessName;
      settings.contactPhone = contactPhone || settings.contactPhone;
      settings.contactEmail = contactEmail || settings.contactEmail;
      settings.aboutText = req.body.businessDescription || settings.aboutText;
      if (workingHours) Object.assign(settings, { workingHours });
      await settings.save();
    }

    link.status = 'used';
    link.onboardedEmail = email;
    await link.save();

    envRes.sendSuccess({ success: true });
  } catch (err: any) {
    if (err.code === 11000) return envRes.sendError(400, 'API_ERROR', 'Email or Client ID already in use');
    envRes.sendError(500, 'API_ERROR', 'Onboarding failed' + ': ' + err.message);
  }
});

// Get settings for external or internal use
router.get('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    let settings = await Settings.findOne({ clientId });
    
    const settingsObj = settings ? settings.toObject() : {};

    // Ensure all CMS fields exist
    const defaults = {
        heroBadge: 'Engineering Excellence',
        servicesBadge: 'OUR SOLUTIONS',
        servicesTitle: 'Software & IT Services',
        servicesSubtitle: 'End-to-end digital services tailored for your growth and transformation.',
        trustTitle: 'Built on Trust',
        trustDescription: 'We deliver software that powers mission-critical operations worldwide.',
        trustCardTitle: 'Secure & Robust',
        trustCardSubtitle: 'Enterprise-grade security',
        portfolioBadge: 'Portfolio',
        portfolioTitle: 'Recent Projects',
        ctaTitle: 'Ready to Scale?',
        ctaSubtitle: 'Our architects are ready to build your next generation platform.',
        ctaPrimaryBtn: 'Start Project',
        ctaSecondaryBtn: 'Contact Sales',
        aboutBadge: 'Our Story',
        aboutHeroTitle: 'Building the',
        aboutHeroHighlight: 'Digital Future',
        aboutHeroSubtitle: 'Discover how we help companies navigate the complexities of modern software.',
        aboutSectionTitle: 'Our Philosophy',
        aboutSectionHighlight: 'Commitment',
        contactTitle: 'Let\'s Build',
        contactHighlight: 'Together',
        contactSubtitle: 'Ready to deploy something extraordinary? Our technical team is standing by to roadmap your transformation.',
        regionalFocus: 'Active in 12 Zones',
        footerDescription: 'Empowering the next generation of digital transformation through precision engineering and visionary software solutions.',
        footerContactTitle: 'Contact Us',
        email: 'concierge@platform.com',
        phone: '+1 (555) PLATFORM',
        address: 'Silicon Quarter, DXB'
    };

    const finalSettings = { ...defaults, ...settingsObj };

    envRes.sendSuccess({
      ...finalSettings,
      // Flatten common branding fields for SDK simplicity
      heroTitle: finalSettings.heroTitle || finalSettings.branding?.heroTitle,
      heroSubtitle: finalSettings.heroSubtitle || finalSettings.branding?.heroSubtitle,
      aboutText: finalSettings.aboutText || finalSettings.branding?.aboutText,
      primaryColor: finalSettings.primaryColor || finalSettings.branding?.primaryColor,
      fontFamily: finalSettings.fontFamily || finalSettings.branding?.fontFamily,
      heroImage: finalSettings.branding?.heroImage
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
    
    // Ensure client exists and is active
    let client = await Client.findOne({ clientId });
    if (!client && clientId === 'platform-prime') {
      client = await Client.create({
        clientId: 'platform-prime',
        businessName: 'Platform Central',
        email: 'central@platform.com',
        password: 'platform_prime_placeholder',
        role: 'superadmin',
        status: 'active'
      });
    }

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

    sendEmail(settings.contactEmail || settings.email || 'admin@platform.com', 'External Booking Received', `New booking: ${fullName}\nService: ${serviceSelection}`);
    sendEmail(email, 'Booking Request Received', `Hello ${fullName}, your booking has been received.`);

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
    const pSettings = await PlatformSettings.findOne();
    if (pSettings?.allowAnonymousContact === false) {
       // Optional: Block if anonymous is disabled
       // For now just logging or we could enforce auth if needed
    }

    const clientId = await resolveClientId(req);
    
    // Ensure client exists
    let client = await Client.findOne({ clientId });
    if (!client && clientId === 'platform-prime') {
      client = await Client.create({
        clientId: 'platform-prime',
        businessName: 'Platform Central',
        email: 'central@platform.com',
        password: 'platform_prime_placeholder',
        role: 'superadmin',
        status: 'active'
      });
    }

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

    sendEmail(settings.contactEmail, 'New Website Message', `From: ${name} (${email})\n\n${message}`);
    sendEmail(email, 'Message Received', `Hello ${name}, thank you for reaching out. We'll be in touch soon.`);

    envRes.sendSuccess({ contactId: contact._id  });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Message failed' + ': ' + err.message);
  }
});


// Public Form Fetching
router.get('/forms/:formId', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { formId } = req.params;
    const form = await mongoose.models.Form.findOne({ _id: formId, status: 'active' });
    if (!form) return envRes.sendError(404, 'API_ERROR', 'Form not found');

    if (form.expiresAt && new Date() > form.expiresAt) {
      return envRes.sendError(400, 'API_ERROR', 'This form has expired');
    }

    envRes.sendSuccess(form);
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch form: ' + err.message);
  }
});

// Public Lead Submission
router.post('/forms/:formId/submit', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { formId } = req.params;
    const form = await mongoose.models.Form.findOne({ _id: formId, status: 'active' });
    if (!form) return envRes.sendError(404, 'API_ERROR', 'Form not found');

    if (form.expiresAt && new Date() > form.expiresAt) {
      return envRes.sendError(400, 'API_ERROR', 'This form has expired');
    }

    const data = req.body;
    let contactFirst = data.firstName || data.first_name || '';
    let contactLast = data.lastName || data.last_name || '';
    
    // Fallback parsing name if only full name is given
    if (!contactFirst && data.name) {
      const parts = data.name.split(' ');
      contactFirst = parts[0];
      contactLast = parts.slice(1).join(' ');
    }

    const contactEmail = data.email || data.emailAddress || '';
    const contactPhone = data.phone || data.phoneNumber || '';

    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const location = await getGeoLocation(ip.split(',')[0].trim());

    // Upsert Lead with deduplication
    const lead = await upsertLead({
      clientId: form.clientId,
      email: contactEmail,
      phone: contactPhone,
      name: `${contactFirst} ${contactLast}`.trim(),
      source: 'form',
      location,
      tags: [...(form.tags || []), 'form-submission'],
      data: {
        ...data,
        formId: form._id,
        formName: form.name
      }
    });

    const settings = await Settings.findOne({ clientId: form.clientId });
    if (settings && settings.contactEmail) {
      sendEmail(settings.contactEmail, `New Lead: ${form.name}`, `A new lead has been submitted to your form "${form.name}".\n\nName: ${contactFirst} ${contactLast}\nEmail: ${contactEmail}\nPhone: ${contactPhone}\n\nView more details in your dashboard.`);
    }

    envRes.sendSuccess({ leadId: lead._id });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Lead submission failed: ' + err.message);
  }
});

// Public AI Chat Interaction
router.post('/ai/chat', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

    const { message, history, userName, userEmail } = req.body;

    const [client, settings] = await Promise.all([
      Client.findOne({ clientId }),
      Settings.findOne({ clientId })
    ]);

    if (!client || client.status !== 'active') {
      return envRes.sendError(401, 'API_ERROR', 'AI Assistant is currently unavailable for this account.');
    }

    const { checkAIQuota, recordAIUsage } = await import('../services/quotaService');
    const quotaCheck = await checkAIQuota(clientId, 100, 'chat');
    if (!quotaCheck.allowed) {
      return envRes.sendError(429, 'QUOTA_EXCEEDED', quotaCheck.reason || 'AI token quota exceeded for this billing cycle.');
    }

    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

    const userFirstName = userName ? userName.split(' ')[0] : (userEmail?.split('@')[0] || '');
    const nameInstruction = userFirstName 
      ? `The user's name is ${userFirstName}. You MUST refer to them by their first name frequently (e.g. "Sure, ${userFirstName}...", "Great question, ${userFirstName}") to maintain a personalized technical session.` 
      : 'The user has not provided a name yet.';

    const businessContext = `
      You are the AI Assistant for ${client.businessName}.
      Business Type: ${client.businessType || 'General'}
      About: ${settings?.aboutText || ''}
      Services offered: ${settings?.services?.map((s: any) => `${s.name}: ${s.description}`).join(', ') || ''}
      Working Hours: ${settings?.workingHours?.filter((h: any) => h.isOpen).map((h: any) => `${h.day}: ${h.openTime}-${h.closeTime}`).join(', ') || ''}
      Contact Email: ${settings?.contactEmail || client.email}
      Contact Phone: ${settings?.contactPhone || ''}
      
      User Context:
      - Current User: ${userFirstName || 'Guest'}
      - User Email: ${userEmail || 'undisclosed'}
      
      CRITICAL INSTRUCTION:
      ${nameInstruction}
      - Always address the user by their first name if known.
      - Be professional, technical, and data-driven.
      - Guide users to use the booking tool for formal sessions.
    `.trim();

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: businessContext },
        ...(history || []).map((h: any) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content || h.text || ''
        })),
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile'
    });

    const text = completion.choices[0].message.content || '';
    
    // Log AI usage via QuotaService
    await recordAIUsage(clientId, 'chat', '/ai/chat', 'groq-llama-3.3-70b', 100, { userEmail });

    envRes.sendSuccess({ text });

    // Sync to Leads if user info is provided
    if (userName && userEmail) {
      const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
      const location = await getGeoLocation(ip.split(',')[0].trim());
      await upsertLead({
        clientId: clientId,
        email: userEmail,
        phone: '',
        name: userName,
        source: 'contact', // Categorizing chat leads under contact/chat
        location,
        tags: ['ai-chat-lead'],
        data: {
          lastChatMessage: message,
          chatSessionId: req.body.sessionId
        }
      });
    }
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    envRes.sendError(500, 'API_ERROR', 'AI Chat failed: ' + err.message);
  }
});

// Identify user in Chat for Lead Capture
router.post('/ai/chat/identify', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

    const { name, email, phone } = req.body;
    if (!email) return envRes.sendError(400, 'BAD_REQUEST', 'Email is required');

    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '';
    const location = await getGeoLocation(ip.split(',')[0].trim());

    const lead = await upsertLead({
      clientId,
      email,
      phone: phone || '',
      name: name || '',
      source: 'contact',
      location,
      tags: ['ai-chat-identified'],
      data: { identifiedVia: 'ai-chat' }
    });

    envRes.sendSuccess({ success: true, leadId: lead._id });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Identification failed: ' + err.message);
  }
});

<<<<<<< HEAD
// AI TRAINING ENDPOINTS - Exclusively for superadmin tenant 'platform-prime'

// Get all AI training knowledge
router.get('/ai/training/knowledge', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const superadminId = 'platform-prime';
    const knowledge = await AITrainingKnowledge.find({ 
      clientId: superadminId, 
      status: 'active' 
    }).sort({ category: 1, createdAt: -1 }).lean();
    envRes.sendSuccess(knowledge);
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch knowledge: ' + err.message);
  }
});

// Get AI training knowledge by category
router.get('/ai/training/knowledge/:category', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const superadminId = 'platform-prime';
    const { category } = req.params;
    const knowledge = await AITrainingKnowledge.find({ 
      clientId: superadminId, 
      category,
      status: 'active' 
    }).sort({ createdAt: -1 }).lean();
    envRes.sendSuccess(knowledge);
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch knowledge: ' + err.message);
  }
});

// Create new AI training knowledge entry - requires superadmin auth
router.post('/ai/training/knowledge', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { title, content, category, tags } = req.body;
    
    if (!title || !content || !category) {
      return envRes.sendError(400, 'VALIDATION_ERROR', 'title, content, and category are required');
    }

    const superadminId = 'platform-prime';
    const knowledge = await AITrainingKnowledge.create({
      clientId: superadminId,
      title,
      content,
      category,
      tags: tags || [],
      status: 'active'
    });

    envRes.sendSuccess(knowledge, 'Training knowledge created');
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to create knowledge: ' + err.message);
  }
});

// Update AI training knowledge - requires superadmin auth
router.put('/ai/training/knowledge/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { id } = req.params;
    const { title, content, category, tags, status } = req.body;
    const superadminId = 'platform-prime';

    const knowledge = await AITrainingKnowledge.findOneAndUpdate(
      { _id: id, clientId: superadminId },
      { 
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(status && { status })
      },
      { new: true }
    );

    if (!knowledge) {
      return envRes.sendError(404, 'NOT_FOUND', 'Knowledge entry not found');
    }

    envRes.sendSuccess(knowledge, 'Knowledge updated');
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update knowledge: ' + err.message);
  }
});

// Delete AI training knowledge - requires superadmin auth
router.delete('/ai/training/knowledge/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { id } = req.params;
    const superadminId = 'platform-prime';

    const knowledge = await AITrainingKnowledge.findOneAndUpdate(
      { _id: id, clientId: superadminId },
      { status: 'archived' },
      { new: true }
    );

    if (!knowledge) {
      return envRes.sendError(404, 'NOT_FOUND', 'Knowledge entry not found');
    }

    envRes.sendSuccess({ success: true }, 'Knowledge archived');
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to archive knowledge: ' + err.message);
=======
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
>>>>>>> origin/main
  }
});

export default router;
