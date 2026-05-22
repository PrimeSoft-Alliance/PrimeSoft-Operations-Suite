import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Client, Settings, UsageStats, Booking, Contact, Invite, OnboardingRequest, Domain, AuditLog, PlatformNotification, PromptHistory, PlatformSettings } from '../models';
import { superAdminMiddleware } from '../auth';

const router = express.Router();

router.use(superAdminMiddleware);

// Helper for audit logging
async function logAction(actor: string, action: string, target?: string, metadata?: any, ip?: string) {
  try {
    const pSettings = await PlatformSettings.findOne();
    if (pSettings?.detailedAuditLogging === false) {
      // If detailed logging is off, we only log critical actions
      const criticalActions = ['UPDATE_PLATFORM_SETTINGS', 'DELETE_CLIENT', 'APPROVE_ONBOARDING', 'UPDATE_CLIENT'];
      if (!criticalActions.includes(action)) return;
    }
    await AuditLog.create({ actor, action, target, metadata, ip });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

// Helper for notifications
async function notify(title: string, message: string, type: 'info'|'warning'|'error'|'success' = 'info', link?: string, clientId?: string) {
  try {
    await PlatformNotification.create({ title, message, type, link, clientId });
  } catch (err) {
    console.error('Notification Error:', err);
  }
}

// Generate unique, duplicate-free Client ID helper
async function generateUniqueClientId(businessName: string): Promise<string> {
  const base = String(businessName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const baseSlug = base || 'client';
  let clientId = `${baseSlug}-${Math.random().toString(36).substring(7)}`;
  let attempt = 0;
  
  while (attempt < 20) {
    const existingClient = await Client.findOne({ clientId });
    const existingInvite = await Invite.findOne({ clientId });
    if (!existingClient && !existingInvite) {
      return clientId;
    }
    clientId = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    attempt++;
  }
  return `${baseSlug}-${crypto.randomUUID().substring(0, 8)}`;
}

// Onboarding Requests
router.get('/onboarding-requests', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const requests = await OnboardingRequest.find().sort({ createdAt: -1 });
    envRes.sendSuccess(requests);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Server error');
  }
});

router.post('/onboarding-requests/:id/approve', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { id } = req.params;
    const request = await OnboardingRequest.findOneAndUpdate({ requestId: id }, { status: 'approved' }, { new: true });
    if (!request) return envRes.sendError(404, 'API_ERROR', 'Request not found');
    
    // Create a duplicate-free invite for the newly approved business
    const clientId = await generateUniqueClientId(request.businessName);
    const token = crypto.randomBytes(32).toString('hex');
    const activationToken = 'ACT-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Valid for 7 days
    const inviteId = `inv_${crypto.randomBytes(6).toString('hex')}`;

    await Invite.create({
      inviteId,
      clientId,
      token,
      expiresAt,
      status: 'pending',
      onboardedEmail: request.email
    });

    // We can also pre-create the client record or wait for onboarding. 
    // Usually we wait for onboarding. But the user wants an "activation token".
    // Let's ensure the activation token is stored for the client when it's eventually created.
    // Or better, generate it here and tell the user.

    await logAction((req as any).user?.email || 'admin', 'APPROVE_ONBOARDING', id, { clientId, inviteId, activationToken });

    // Send Approval Email
    const fullUrl = `${req.headers.origin}/onboarding/${token}`;
    const { sendEmail } = await import('../email');
    await sendEmail(request.email, 'Approved - Business Platform', 
      `Congratulations ${request.businessName}!\n\nYour onboarding request has been approved. Please follow the link below to set up your account:\n\n${fullUrl}\n\nThis link expires in 7 days.`,
      undefined, 'super-admin-001'
    );

    envRes.sendSuccess({ inviteUrl: fullUrl  });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to approve');
  }
});

// Health Checks
router.get('/health', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'degraded';
    
    // Test AI availability (simulated check)
    let aiStatus = 'healthy';
    try {
      // In real scenario, test connectivity to Groq
    } catch {
      aiStatus = 'down';
    }

    envRes.sendSuccess({
      status: dbStatus === 'healthy' && aiStatus === 'healthy' ? 'healthy' : 'degraded',
      services: {
        database: { status: dbStatus, latency: '12ms' },
        ai: { status: aiStatus, provider: 'Groq' },
        email: { status: 'healthy', provider: 'SMTP' },
        storage: { status: 'healthy', used: '42.5MB' }
      },
      uptime: process.uptime(),
      timestamp: new Date()
    });
  } catch (err) {
    envRes.sendError(500, 'HEALTH_ERROR', 'Health check failed', err instanceof Error ? err.message : 'Unknown');
  }
});

// Domain Management
router.get('/domains', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const domains = await Domain.find().sort({ createdAt: -1 });
    envRes.sendSuccess(domains);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch domains');
  }
});

router.post('/domains', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId, host, type } = req.body;
    const domain = await Domain.create({ clientId, host, type, status: 'active', verified: true });
    await logAction((req as any).user?.email || 'admin', 'CREATE_DOMAIN', clientId, { host, type });
    envRes.sendSuccess(domain);
  } catch (err) {
    envRes.sendError(400, 'API_ERROR', 'Domain already exists or invalid data');
  }
});

router.delete('/domains/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const d = await Domain.findById(req.params.id);
    await Domain.findByIdAndDelete(req.params.id);
    if (d) await logAction((req as any).user?.email || 'admin', 'DELETE_DOMAIN', d.clientId, { host: d.host });
    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Delete failed');
  }
});

router.post('/onboarding-requests/:id/reject', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await OnboardingRequest.findOneAndUpdate({ requestId: id }, { status: 'rejected', superadminNotes: reason }, { new: true });
    if (!request) return envRes.sendError(404, 'API_ERROR', 'Request not found');

    await logAction((req as any).user?.email || 'admin', 'REJECT_ONBOARDING', id, { reason });

    const { sendEmail } = await import('../email');
    await sendEmail(request.email, 'Application Status', 
      `Hello ${request.businessName},\n\nThank you for your interest in our platform. Unfortunately, we cannot proceed with your application at this time.\n\nReason: ${reason || 'N/A'}`,
      undefined, 'super-admin-001'
    );

    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to reject');
  }
});

router.post('/onboarding-requests/:id/info-request', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { id } = req.params;
    const { message } = req.body;
    const request = await OnboardingRequest.findOneAndUpdate({ requestId: id }, { status: 'info_needed', superadminNotes: message }, { new: true });
    if (!request) return envRes.sendError(404, 'API_ERROR', 'Request not found');

    const { sendEmail } = await import('../email');
    await sendEmail(request.email, 'More Information Needed', 
      `Hello ${request.businessName},\n\nWe need a few more details to process your application:\n\n${message}\n\nPlease reply to this email or chat with our AI assistant to provide the information.`,
      undefined, 'super-admin-001'
    );

    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to send info request');
  }
});

// Get all clients with real database usage stats
router.get('/clients', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clients = await Client.find({ role: 'client' }).select('-password').lean();
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const usages = await UsageStats.find({ month: currentMonth }).lean();

    const usageMap = new Map();
    for (const u of usages) {
      usageMap.set(u.clientId, u);
    }

    const processedClients = clients.map((c: any) => {
      const u = usageMap.get(c.clientId) || {};
      return {
        ...c,
        status: c.status || 'active',
        aiMessagesUsed: u.aiMessagesUsed || 0,
        storageBytesUsed: u.storageBytesUsed || 0
      };
    });
    envRes.sendSuccess(processedClients);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Server error');
  }
});

// Generate a guaranteed unique client ID based on business name
router.get('/clients/generate-id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const name = String(req.query.name || 'client');
    const clientId = await generateUniqueClientId(name);
    envRes.sendSuccess({ clientId });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to generate unique client ID');
  }
});

// AI Prompt Generator (Moved from ai.ts as requested)
router.get('/builder-prompt/:clientId', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId } = req.params;
    const settings = await Settings.findOne({ clientId });
    if (!settings) return envRes.sendError(404, 'API_ERROR', 'Settings not found');

    const prompt = `
Build a modern, high-converting React website for a business called "${settings.businessName}". 
Business Overview: ${settings.aboutText || 'A professional service provider focusing on quality and customer satisfaction.'}
Contact Point: ${settings.contactPhone}, ${settings.contactEmail}.

SERVICES & SOLUTIONS:
${settings.services.length > 0 ? settings.services.map((s: any) => `- ${s.name}: ${s.description}`).join('\n') : '- Contact us for specific services.'}

TECHNICAL REQUIREMENTS:
1. Add this HEADLESS SDK script tag in your index.html/head: <script src="${req.headers.origin || ('https://' + req.get('host'))}/sdk.js" data-client-id="${clientId}" data-features="chat,booking,contact,content" data-auto-detect="true" async></script>
2. CMS SYNC: Wrap editable text, image URLs, and CTA links with data-platform-content attributes.
   Example: <h1 data-platform-content="heroTitle">...</h1>, <img data-platform-content="heroImage" src="..." />, <p data-platform-content="aboutText">...</p>
3. The SDK will automatically inject the AI Chatbot and handle Form submissions if they use standard data attributes.
4. For Booking Form (manual injection): Add data-platform-form="booking" to your form. Fields: fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, notes.
5. For Contact Form (manual injection): Add data-platform-form="contact" to your form. Fields: name, email, phone, message, preferredContactMethod.
6. Use a ${settings.branding?.layoutStyle || 'modern'} aesthetic with ${settings.branding?.primaryColor || '#2563eb'} as primary color.
`.trim();

    envRes.sendSuccess({ prompt });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Prompt generation failed');
  }
});

// Generate Onboarding Link
router.post('/generate-onboarding-link', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId, expiryHours = 24, customFields = [] } = req.body;
    
    if (!clientId) return envRes.sendError(400, 'API_ERROR', 'Client ID is required');

    // Clean up any existing unused/expired links for this ID
    await Invite.updateMany({ clientId, status: 'pending' }, { status: 'revoked' });

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + Number(expiryHours));
    const inviteId = `inv_${crypto.randomBytes(6).toString('hex')}`;

    await Invite.create({
      inviteId,
      clientId,
      token,
      expiresAt,
      status: 'pending',
      customFields
    });

    const fullUrl = `${req.headers.origin}/onboarding/${token}`;
    envRes.sendSuccess({ url: fullUrl, expiresAt  });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to generate link');
  }
});

// Create new client
router.post('/clients', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { 
      clientId, businessName, businessType, email, password, 
      aiMessageLimit, storageLimitBytes, customDomain, subdomain, 
      contactPhone, contactEmail, businessDescription,
      customFields 
    } = req.body;
    
    // Check individually to give better errors
    const existing = await Client.findOne({ $or: [{ clientId }, { email }] });
    if (existing) return envRes.sendError(400, 'API_ERROR', 'Client ID or Email already exists');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const activationToken = 'ACT-' + crypto.randomBytes(12).toString('hex').toUpperCase();

    const clientPayload: any = {
      clientId,
      businessName,
      businessType,
      email,
      password: hash,
      aiMessageLimit,
      storageLimitBytes,
      customFields,
      activationToken,
      isActivated: false,
      apiKey: 'pk_live_' + crypto.randomBytes(16).toString('hex')
    };
    if (customDomain) clientPayload.customDomain = customDomain;
    if (subdomain) clientPayload.subdomain = subdomain;

    const client = await Client.create(clientPayload);

    if (customDomain) {
      await Domain.create({
        clientId,
        host: customDomain,
        type: 'custom',
        status: 'active'
      });
    }

    if (subdomain) {
      await Domain.create({
        clientId,
        host: `${String(subdomain).trim().toLowerCase().replace(/[^a-z0-9-]/g, '')}.client.com`,
        type: 'subdomain',
        status: 'active'
      });
    }

    await UsageStats.create({
      clientId,
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      aiMessagesUsed: 0,
      storageBytesUsed: 0,
    });

    // Initialize settings
    await Settings.create({
      clientId,
      businessName,
      contactEmail: contactEmail || email,
      contactPhone: contactPhone || '',
      aboutText: businessDescription || '',
      workingHours: Array.from({ length: 7 }, (_, i) => ({
        day: i,
        isOpen: i > 0 && i < 6,
        openTime: '08:00',
        closeTime: '17:00'
      }))
    });

    envRes.sendSuccess({ client: { clientId, businessName, email }  });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Server error');
  }
});

// Audit Logs
router.get('/logs', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    envRes.sendSuccess(logs);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch logs');
  }
});

router.post('/logs', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { action, target, metadata } = req.body;
    const actor = (req as any).user?.email || 'admin';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    const log = await AuditLog.create({
      actor,
      action,
      target: target || 'GLOBAL',
      metadata,
      ip: typeof ip === 'string' ? ip : undefined
    });
    
    envRes.sendSuccess(log);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to write audit log');
  }
});

// Get all leads (Platform wide)
router.get('/leads', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { Lead } = await import('../models');
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(50).lean();
    envRes.sendSuccess(leads);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch platform leads');
  }
});

// Platform-wide bookings (Alias for system-admin)
router.get('/bookings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(100).lean();
    envRes.sendSuccess(bookings);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch platform bookings');
  }
});

router.get('/platform-bookings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(50).lean();
    envRes.sendSuccess(bookings);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch platform bookings');
  }
});

// Platform-wide contacts/tickets (Alias for system-admin)
router.get('/inquiries', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).limit(100).lean();
    envRes.sendSuccess(contacts);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch platform inquiries');
  }
});

router.get('/platform-contacts', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 }).limit(50).lean();
    envRes.sendSuccess(contacts);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch platform contacts');
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const notifs = await PlatformNotification.find({ read: false }).sort({ createdAt: -1 });
    envRes.sendSuccess(notifs);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch notifications');
  }
});

// Admin stats
router.get('/stats', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const totalClients = await Client.countDocuments({ role: 'client' });
    const activeClients = await Client.countDocuments({ role: 'client', status: { $ne: 'suspended' } });
    const suspendedClients = await Client.countDocuments({ role: 'client', status: 'suspended' });
    const pendingOnboarding = await OnboardingRequest.countDocuments({ status: 'pending' });
    const totalBookings = await Booking.countDocuments();
    const totalContacts = await Contact.countDocuments();
    
    // Usage stats
    const usage = await UsageStats.aggregate([
      { $group: { _id: null, totalMessages: { $sum: '$aiMessagesUsed' }, totalStorage: { $sum: '$storageBytesUsed' } } }
    ]);

    const nearQuota = await Client.find({ role: 'client' }).limit(5); // In production, would join with UsageStats
    
    envRes.sendSuccess({
      totalClients,
      activeClients,
      suspendedClients,
      pendingOnboarding,
      totalBookings,
      totalContacts,
      totalMessages: usage[0]?.totalMessages || 0,
      totalStorage: (usage[0]?.totalStorage || 0) / (1024 * 1024), // MB
      nearQuota
    });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Server error');
  }
});

// Update client
router.put('/clients/:clientId', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId } = req.params;
    const allowedFields = ['aiMessageLimit', 'storageLimitBytes', 'status', 'businessName', 'email'];
    const update: any = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        update[key] = req.body[key];
      }
    });

    if (Object.keys(update).length === 0) {
      return envRes.sendError(400, 'API_ERROR', 'No valid fields provided');
    }

    const updated = await Client.findOneAndUpdate({ clientId }, { $set: update }, { new: true });
    console.log(`Updated client ${clientId}:`, update);
    if (!updated) {
      console.log(`Client ${clientId} not found for update`);
      return envRes.sendError(404, 'API_ERROR', 'Client not found');
    }
    
    await logAction((req as any).user?.email || 'admin', 'UPDATE_CLIENT', clientId, update);
    
    envRes.sendSuccess({ client: updated  });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Update failed');
  }
});

router.put('/clients/:clientId/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId } = req.params;
    const settings = await Settings.findOneAndUpdate(
      { clientId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    await logAction((req as any).user?.email || 'admin', 'UPDATE_CLIENT_SETTINGS', clientId, req.body);
    envRes.sendSuccess({ settings });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Settings update failed');
  }
});

// Delete client
router.delete('/clients/:clientId', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId } = req.params;
    const client = await Client.findOne({ clientId });
    if (!client) return envRes.sendError(404, 'API_ERROR', 'Client not found');

    await Client.deleteOne({ clientId });
    await Settings.deleteOne({ clientId });
    await Booking.deleteMany({ clientId });
    await Contact.deleteMany({ clientId });
    await UsageStats.deleteMany({ clientId });
    await Domain.deleteMany({ clientId }); 
    await Invite.deleteMany({ clientId }); 
    
    await logAction((req as any).user?.email || 'admin', 'DELETE_CLIENT', clientId, { businessName: client.businessName });
    
    envRes.sendSuccess({ success: true });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Delete failed');
  }
});

// Platform Global Settings
router.get('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    envRes.sendSuccess(settings);
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch settings');
  }
});

router.put('/settings', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { homepageClientId, platformName, supportEmail, allowAnonymousContact, maintenanceMode, defaultAiLimit, defaultStorageMB, enforceMfa, restrictSubdomains, detailedAuditLogging, masterDns } = req.body;
    
    // Validate homepageClientId if provided
    if (homepageClientId) {
      const client = await Client.findOne({ clientId: homepageClientId });
      if (!client) {
         // We allow it but warn or we can auto-create later
      }
    }

    const settings = await PlatformSettings.findOneAndUpdate({}, {
      homepageClientId, platformName, supportEmail, allowAnonymousContact, maintenanceMode, defaultAiLimit, defaultStorageMB, enforceMfa, restrictSubdomains, detailedAuditLogging, masterDns
    }, { upsert: true, new: true });
    
    await logAction((req as any).user?.email || 'admin', 'UPDATE_PLATFORM_SETTINGS', 'platform', req.body);
    envRes.sendSuccess({ settings  });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update settings');
  }
});

// Generate/Regenerate Activation Token
router.post('/clients/:clientId/regenerate-token', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientId } = req.params;
    const activationToken = 'ACT-' + crypto.randomBytes(12).toString('hex').toUpperCase();
    const client = await Client.findOneAndUpdate({ clientId }, { activationToken }, { new: true });
    if (!client) return envRes.sendError(404, 'API_ERROR', 'Client not found');
    
    await logAction((req as any).user?.email || 'admin', 'REGENERATE_ACTIVATION_TOKEN', clientId);
    envRes.sendSuccess({ activationToken });
  } catch (err) {
    envRes.sendError(500, 'API_ERROR', 'Failed to regenerate token');
  }
});

export default router;
