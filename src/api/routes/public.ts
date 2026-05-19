import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Settings, Booking, Contact, Invite, Client, Domain, UsageStats, Lead } from '../models';
import { sendEmail } from '../email';
import { startOfDay, addMinutes, format } from 'date-fns';

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

// Helper to upsert a lead with deduplication
async function upsertLead(params: {
  clientId: string;
  email: string;
  phone: string;
  name?: string;
  source: 'form' | 'booking' | 'contact';
  location: any;
  data?: any;
  tags?: string[];
}) {
  // Build query criteria for deduplication
  const criteria: any = { clientId: params.clientId };
  const or = [];
  if (params.email && typeof params.email === 'string' && params.email.trim()) {
    or.push({ contactEmail: params.email.trim() });
  }
  if (params.phone && typeof params.phone === 'string' && params.phone.trim()) {
    or.push({ contactPhone: params.phone.trim() });
  }
  
  let lead = null;
  if (or.length > 0) {
    lead = await Lead.findOne({ ...criteria, $or: or });
  }

  const [first, ...lastParts] = (params.name || '').split(' ');
  const contactFirst = first || '';
  const contactLast = lastParts.join(' ') || '';

  // Extract form info if present in data
  const formId = params.data?.formId;
  const formName = params.data?.formName;

  if (lead) {
    // Update existing lead
    lead.lastActivity = new Date();
    // Append tags
    const newTags = new Set([...(lead.tags || []), ...(params.tags || [])]);
    if (params.source === 'booking') newTags.add('from booking');
    if (params.source === 'contact') newTags.add('from contact');
    
    lead.tags = Array.from(newTags);
    
    // If it's a booking, it's very strong
    if (params.source === 'booking') {
      lead.stage = 'Qualified';
      lead.score = Math.min(100, (lead.score || 0) + 20);
    }
    
    // Update location if it was unknown
    if (lead.location?.city === 'Unknown' || !lead.location?.city) {
      lead.location = params.location;
    }
    
    // Update name if missing
    if (!lead.contactFirst) lead.contactFirst = contactFirst;
    if (!lead.contactLast) lead.contactLast = contactLast;

    // Update form info if not set
    if (formId && !lead.formId) lead.formId = formId;
    if (formName && !lead.formName) lead.formName = formName;
    
    // Merge data
    if (params.data) {
      const existingData = lead.data instanceof Map ? Object.fromEntries(lead.data) : (lead.data || {});
      lead.data = { ...existingData, ...params.data };
    }

    // Add activity
    lead.activities.push({
      type: 'system',
      description: `Lead updated from ${params.source}`,
      date: new Date(),
      metadata: { source: params.source }
    });
    
    await lead.save();
    return lead;
  } else {
    // Create new lead
    const tags = params.tags || [];
    if (params.source === 'booking') tags.push('from booking');
    if (params.source === 'contact') tags.push('from contact');

    const stage = params.source === 'booking' ? 'Qualified' : 'New';
    const score = params.source === 'booking' ? 80 : 20;

    return await Lead.create({
      clientId: params.clientId,
      formId,
      formName,
      contactFirst,
      contactLast,
      contactEmail: params.email,
      contactPhone: params.phone,
      source: params.source,
      location: params.location,
      tags,
      stage,
      score,
      data: params.data || {},
      lastActivity: new Date(),
      activities: [{
        type: 'system',
        description: `Lead initialized via ${params.source}`,
        date: new Date(),
        metadata: { source: params.source }
      }]
    });
  }
}


// Helper to resolve client identity from various signals
async function resolveClientId(req: express.Request): Promise<string | null> {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  let headerId = req.headers['x-client-id'];
  let queryId = req.query.clientId;
  let bodyId = req.body?.clientId;

  if (typeof headerId === 'object' && headerId !== null && 'clientId' in headerId) headerId = (headerId as any).clientId;
  if (typeof queryId === 'object' && queryId !== null && 'clientId' in queryId) queryId = (queryId as any).clientId;
  if (typeof bodyId === 'object' && bodyId !== null && 'clientId' in bodyId) bodyId = (bodyId as any).clientId;

  if (apiKey) {
    const client = await Client.findOne({ apiKey });
    if (client) return client.clientId;
  }

  const cid = headerId || queryId || bodyId;
  return cid ? String(cid) : null;
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
      contactPhone, contactEmail, workingHours, customFields = {} 
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
        apiKey: 'pk_live_' + crypto.randomBytes(16).toString('hex')
      });
    } else {
      client.businessName = businessName || client.businessName;
      client.businessType = businessType || client.businessType;
      if (subdomain) client.subdomain = subdomain;
      client.password = hash;
      client.customFields = { ...client.customFields, ...customFields };
      if (email) client.email = email;
      await client.save();
    }

    if (subdomain) {
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
    
    if (!settings) {
      return envRes.sendError(404, 'API_ERROR', 'Client settings not found');
    }

    const settingsObj = settings.toObject();

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
    const client = await Client.findOne({ clientId });
    if (!client || client.status === 'suspended') {
      return envRes.sendError(403, 'API_ERROR', 'This business is currently not accepting bookings.');
    }
    const { fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, notes } = req.body;

    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Client not found');

    const selectedService = settings.services.find((s: any) => s.name === serviceSelection);
    const duration = selectedService?.durationMinutes || settings.slotDurationMinutes || 60;
    
    const startDate = new Date(preferredDate);
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

    // Sync to Leads with higher priority
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

    sendEmail(settings.contactEmail, 'External Booking Received', `New booking: ${fullName}\nService: ${serviceSelection}`);
    sendEmail(email, 'Booking Request Received', `Hello ${fullName}, your booking has been received.`);

    envRes.sendSuccess({ bookingId: booking._id  });
  } catch (err: any) {
    envRes.sendError(500, 'API_ERROR', 'Booking failed' + ': ' + err.message);
  }
});

// Public Contact Submission (for external sites)
router.post('/contact', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);
    const client = await Client.findOne({ clientId });
    if (!client || client.status === 'suspended') {
      return envRes.sendError(403, 'API_ERROR', 'This business is currently not accepting messages.');
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

    const { message, history } = req.body;

    const [client, settings] = await Promise.all([
      Client.findOne({ clientId }),
      Settings.findOne({ clientId })
    ]);

    if (!client || client.status !== 'active') {
      return envRes.sendError(403, 'API_ERROR', 'AI Assistant is currently unavailable for this account.');
    }

    const { Groq } = await import('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy' });

    const businessContext = `
      You are the AI Assistant for ${client.businessName}.
      Business Type: ${client.businessType || 'General'}
      About: ${settings?.aboutText || ''}
      Services offered: ${settings?.services?.map((s: any) => `${s.name}: ${s.description}`).join(', ') || ''}
      Working Hours: ${settings?.workingHours?.filter((h: any) => h.isOpen).map((h: any) => `${h.day}: ${h.openTime}-${h.closeTime}`).join(', ') || ''}
      Contact Email: ${settings?.contactEmail || client.email}
      Contact Phone: ${settings?.contactPhone || ''}
      
      Instructions:
      - Be professional, helpful, and concise.
      - If users ask for booking, guide them to use the booking tool or provide the contact info.
      - Only answer based on the provided business context. If you don't know, ask them to contact the business directly.
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
    
    // Log AI usage
    const currentMonth = format(new Date(), 'yyyy-MM');
    await UsageStats.updateOne(
      { clientId, month: currentMonth },
      { $inc: { aiMessagesUsed: 1 } },
      { upsert: true }
    );

    envRes.sendSuccess({ text });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    envRes.sendError(500, 'API_ERROR', 'AI Chat failed: ' + err.message);
  }
});

export default router;
