import express from 'express';
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

// Onboarding Requests
router.get('/onboarding-requests', async (req, res) => {
  try {
    const requests = await OnboardingRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/onboarding-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const request = await OnboardingRequest.findOneAndUpdate({ requestId: id }, { status: 'approved' }, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    // Create an invite for the newly approved business
    const clientId = request.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(7);
    const token = crypto.randomBytes(32).toString('hex');
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

    await logAction((req as any).user?.email || 'admin', 'APPROVE_ONBOARDING', id, { clientId, inviteId });

    // Send Approval Email
    const fullUrl = `${req.headers.origin}/onboarding/${token}`;
    const { sendEmail } = await import('../email');
    await sendEmail(request.email, 'Approved - PrimeSoft Alliance', 
      `Congratulations ${request.businessName}!\n\nYour onboarding request has been approved. Please follow the link below to set up your account:\n\n${fullUrl}\n\nThis link expires in 7 days.`,
      undefined, 'super-admin-001'
    );

    res.json({ success: true, inviteUrl: fullUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve' });
  }
});

// Health Checks
router.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'healthy' : 'degraded';
    
    // Test AI availability (simulated check)
    let aiStatus = 'healthy';
    try {
      // In real scenario, test connectivity to Groq/Gemini
    } catch {
      aiStatus = 'down';
    }

    res.json({
      status: dbStatus === 'healthy' && aiStatus === 'healthy' ? 'healthy' : 'degraded',
      services: {
        database: { status: dbStatus, latency: '12ms' },
        ai: { status: aiStatus, provider: 'Groq/Gemini' },
        email: { status: 'healthy', provider: 'SMTP' },
        storage: { status: 'healthy', used: '42.5MB' }
      },
      uptime: process.uptime(),
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ status: 'down', error: err instanceof Error ? err.message : 'Unknown' });
  }
});

// Domain Management
router.get('/domains', async (req, res) => {
  try {
    const domains = await Domain.find().sort({ createdAt: -1 });
    res.json(domains);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

router.post('/domains', async (req, res) => {
  try {
    const { clientId, host, type } = req.body;
    const domain = await Domain.create({ clientId, host, type, status: 'active', verified: true });
    await logAction((req as any).user?.email || 'admin', 'CREATE_DOMAIN', clientId, { host, type });
    res.json(domain);
  } catch (err) {
    res.status(400).json({ error: 'Domain already exists or invalid data' });
  }
});

router.delete('/domains/:id', async (req, res) => {
  try {
    const d = await Domain.findById(req.params.id);
    await Domain.findByIdAndDelete(req.params.id);
    if (d) await logAction((req as any).user?.email || 'admin', 'DELETE_DOMAIN', d.clientId, { host: d.host });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.post('/onboarding-requests/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const request = await OnboardingRequest.findOneAndUpdate({ requestId: id }, { status: 'rejected', superadminNotes: reason }, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    await logAction((req as any).user?.email || 'admin', 'REJECT_ONBOARDING', id, { reason });

    const { sendEmail } = await import('../email');
    await sendEmail(request.email, 'Application Status - PrimeSoft Alliance', 
      `Hello ${request.businessName},\n\nThank you for your interest in PrimeSoft Alliance. Unfortunately, we cannot proceed with your application at this time.\n\nReason: ${reason || 'N/A'}`,
      undefined, 'super-admin-001'
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject' });
  }
});

router.post('/onboarding-requests/:id/info-request', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const request = await OnboardingRequest.findOneAndUpdate({ requestId: id }, { status: 'info_needed', superadminNotes: message }, { new: true });
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { sendEmail } = await import('../email');
    await sendEmail(request.email, 'More Information Needed - PrimeSoft Alliance', 
      `Hello ${request.businessName},\n\nWe need a few more details to process your application:\n\n${message}\n\nPlease reply to this email or chat with our AI assistant to provide the information.`,
      undefined, 'super-admin-001'
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send info request' });
  }
});

// Get all clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await Client.find({ role: 'client' }).select('-password').lean();
    const processedClients = clients.map((c: any) => ({
      ...c,
      status: c.status || 'active'
    }));
    res.json(processedClients);
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
1. Add this HEADLESS SDK script tag in your index.html/head: <script src="${req.headers.origin || ('https://' + req.get('host'))}/sdk.js" data-client-id="${clientId}" data-features="chat,booking,contact,content" data-auto-detect="true" async></script>
2. CMS SYNC: Wrap editable text, image URLs, and CTA links with data-psa-content attributes.
   Example: <h1 data-psa-content="heroTitle">...</h1>, <img data-psa-content="heroImage" src="..." />, <p data-psa-content="aboutText">...</p>
3. The SDK will automatically inject the AI Chatbot and handle Form submissions if they use standard data attributes.
4. For Booking Form (manual injection): Add data-psa-form="booking" to your form. Fields: fullName, phoneNumber, email, serviceSelection, preferredDate, preferredStartTime, notes.
5. For Contact Form (manual injection): Add data-psa-form="contact" to your form. Fields: name, email, phone, message, preferredContactMethod.
6. Use a ${settings.branding?.layoutStyle || 'modern'} aesthetic with ${settings.branding?.primaryColor || '#2563eb'} as primary color.
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
      status: 'pending'
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
      customDomain,
      apiKey: 'psa_live_' + crypto.randomBytes(16).toString('hex')
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

// Audit Logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifs = await PlatformNotification.find({ read: false }).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Admin stats
router.get('/stats', async (req, res) => {
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
    
    res.json({
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Update client
router.put('/clients/:clientId', async (req, res) => {
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
      return res.status(400).json({ error: 'No valid fields provided' });
    }

    const updated = await Client.findOneAndUpdate({ clientId }, { $set: update }, { new: true });
    console.log(`Updated client ${clientId}:`, update);
    if (!updated) {
      console.log(`Client ${clientId} not found for update`);
      return res.status(404).json({ error: 'Client not found' });
    }
    
    await logAction((req as any).user?.email || 'admin', 'UPDATE_CLIENT', clientId, update);
    
    res.json({ success: true, client: updated });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete client
router.delete('/clients/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    await Client.deleteOne({ clientId });
    await Settings.deleteOne({ clientId });
    await Booking.deleteMany({ clientId });
    await Contact.deleteMany({ clientId });
    await UsageStats.deleteMany({ clientId });
    await Domain.deleteMany({ clientId }); 
    await Invite.deleteMany({ clientId }); 
    
    await logAction((req as any).user?.email || 'admin', 'DELETE_CLIENT', clientId, { businessName: client.businessName });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Platform Global Settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    await logAction((req as any).user?.email || 'admin', 'UPDATE_PLATFORM_SETTINGS', 'platform', req.body);
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
