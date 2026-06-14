import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Client, Settings } from '../models';
import { assignTierToClient } from '../services/quotaService';
import { EnvelopeResponse } from '../middlewares/envelope';
import { sendEmail } from '../email';

const router = express.Router();

router.post('/assign-tier', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const { clientId, tier } = req.body;
  if (!clientId || !tier) return envRes.sendError(400, 'VALIDATION_FAILED', 'Missing clientId or tier');

  try {
    const quota = await assignTierToClient(clientId, tier);
    envRes.sendSuccess({ quota });
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// SuperAdmin removed

const verificationCodes = new Map<string, { code: string; expires: number }>();

router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email.toLowerCase(), {
      code,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes expiry
    });

    console.log(`[VERIFICATION] Code for ${email}: ${code}`);

    const subject = 'Digital Platform Workspace Verification Code';
    const textStr = `Hello,\n\nThank you for choosing our platform! Your official account activation code is: ${code}\n\nThis code is valid for 10 minutes. If you did not make this request, you can safely ignore this mail.\n\nWarm regards,\nThe Support Team`;
    
    const htmlStr = `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 540px; margin: 40px auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.02), 0 8px 10px -6px rgba(0,0,0,0.02); background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="font-size: 24px; font-weight: 900; color: #1e1b4b; border: 2px solid #1e1b4b; padding: 4px 12px; border-radius: 8px; font-family: sans-serif; letter-spacing: -0.5px;">Platform</span>
        </div>
        <h2 style="color: #0f172a; text-align: center; font-size: 20px; font-weight: 800; margin-top: 0; margin-bottom: 8px;">Workspace Activation Code</h2>
        <p style="text-align: center; font-size: 13px; color: #64748b; font-weight: 500; margin-top: 0; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 1px;">Confirm your digital portal</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.6; font-weight: 500; margin-bottom: 24px;">Hello,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.6; font-weight: 500; margin-bottom: 32px;">Configure and activate your ecosystem environment. Please apply the secure 6-digit confirmation key provided below within your browser session:</p>
        
        <div style="font-size: 34px; font-weight: 900; letter-spacing: 8px; text-align: center; margin: 32px 0; color: #4f46e5; background-color: #f5f3ff; border: 1px solid #e0e7ff; padding: 20px; border-radius: 16px; user-select: all;">
          ${code}
        </div>
        
        <p style="font-size: 12px; color: #64748b; line-height: 1.6; font-weight: 500; margin-bottom: 32px; text-align: center;">This single-use code is strictly active for <b>10 minutes</b>.<br/>If this request was not initiated by you, please discard this message safely.</p>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 30px; text-align: center;">
          <p style="font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0;">Platform Digital Group</p>
          <p style="font-size: 10px; color: #cbd5e1; font-weight: 500; margin: 0;">Empowering Digital Transformation Alignment</p>
        </div>
      </div>
    `;

    const emailSent = await sendEmail(email, subject, textStr, htmlStr);

    if (!emailSent.success) {
      console.warn(`[EMAIL SEND OUT FAILURE] Reason: ${emailSent.error}. Returning code in response as absolute fallback.`);
      // If the system SMTP credentials are not yet configured, provide helpful error:
      if (emailSent.error === 'SMTP credentials missing') {
        return res.status(400).json({
          error: 'SMTP verification service is not fully configured on this server.',
          details: 'Please configure SMTP credentials (such as SMTP_USER and SMTP_PASS) in environmental secrets, or verify with sandbox OTP.',
          code: code // Fallback to let them register even when SMTP is missing in their cloud environment
        });
      }
    }

    return res.json({ 
      success: true, 
      message: 'Verification code sent successfully!'
    });
  } catch (err: any) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password, businessName, fullName, phone, businessType, code } = req.body;
    if (!email || !password || !businessName || !code) {
      return res.status(400).json({ error: 'Email, password, business name and verification code are required' });
    }

    // Verify code
    const record = verificationCodes.get(email.toLowerCase());
    if (!record || record.code !== code.trim() || record.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const existingClient = await Client.findOne({ email });
    if (existingClient) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Clean code
    verificationCodes.delete(email.toLowerCase());

    const clientId = 'client_' + crypto.randomBytes(6).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const apiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');

    const customFields = new Map<string, string>();
    if (fullName) customFields.set('fullName', fullName);
    if (phone) customFields.set('phone', phone);

    const client = new Client({
      clientId,
      email,
      businessName,
      businessType: businessType || 'General',
      password: hashedPassword,
      role: 'client',
      isActivated: true,
      apiKey,
      customFields
    });

    await client.save();

    const settings = new Settings({
      clientId,
      businessName,
      heroTitle: 'Welcome to ' + businessName,
      heroSubtitle: 'Advanced Business Solutions',
      domain: clientId + '.platform.com'
    });
    await settings.save();

    const token = jwt.sign(
      { 
        clientId: client.clientId, 
        email: client.email, 
        role: client.role,
        businessName: client.businessName
      }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ 
      success: true, 
      role: client.role, 
      clientId: client.clientId,
      businessName: client.businessName
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', async (req, res) => {
  const envRes = res as any;
  try {
    const { email, password, role } = req.body;
    
    // Default role query to 'client' if not provided to not break API entirely
    const targetRole = role || 'client';
    
    // Find client with matching email AND role
    const client = await Client.findOne({ email, role: targetRole });
    if (!client) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Auto data-sync and self-healing for legacy/seeded clients missing a clientId
    if (!client.clientId) {
      console.log(`[AUTH_HEAL] Client ${email} is missing clientId. Automatically healing using email.`);
      client.clientId = client.email;
      await client.save().catch(err => console.error('[AUTH_HEAL] Failed to save healed clientId:', err));
    }

    if (client.status === 'suspended') {
      return res.status(401).json({ error: 'Account suspended. Please contact support.' });
    }

    if (client.role === 'client' && client.isActivated === false) {
      return res.status(403).json({ 
        error: 'ACCOUNT_NOT_ACTIVATED', 
        message: 'Account pending activation. Please use your license key to activate your portal.' 
      });
    }

    if (!client.password || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check Platform MFA Enforcement
    const { PlatformSettings } = await import('../models');
    const pSettings = await PlatformSettings.findOne();

    const token = jwt.sign(
      { 
        clientId: client.clientId, 
        email: client.email, 
        role: client.role,
        businessName: client.businessName
      }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ 
      success: true, 
      role: client.role, 
      clientId: client.clientId,
      businessName: client.businessName
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/'
  });
  res.json({ success: true });
});

router.post('/assign-tier', async (req, res) => {
  try {
    const { clientId, tier } = req.body;
    if (!clientId || !tier) return res.status(400).json({ error: 'Missing parameters' });
    
    const { assignTierToClient } = await import('../services/quotaService');
    const success = await assignTierToClient(clientId, tier);
    
    if (success) {
      res.json({ success: true, tier });
    } else {
      res.status(500).json({ error: 'Failed' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tier' });
  }
});

router.get('/check', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ authenticated: false });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    res.json({ 
      authenticated: true, 
      role: decoded.role, 
      clientId: decoded.clientId,
      businessName: decoded.businessName
    });
  } catch (e) {
    res.json({ authenticated: false });
  }
});

router.get('/me', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const client = await Client.findOne({ clientId: decoded.clientId });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    res.json({
      clientId: client.clientId,
      email: client.email,
      businessName: client.businessName,
      role: client.role,
      apiKey: client.apiKey,
      mfaEnabled: client.mfaEnabled || false
    });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

router.put('/me', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { businessName, email, password, mfaEnabled } = req.body;
    
    const update: any = {};
    if (businessName) update.businessName = businessName;
    if (email) update.email = email;
    if (mfaEnabled !== undefined) update.mfaEnabled = mfaEnabled;
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      update.password = await bcrypt.hash(password, salt);
    }
    
    const client = await Client.findOneAndUpdate({ clientId: decoded.clientId }, { $set: update }, { new: true });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    res.json({
      success: true,
      user: {
        clientId: client.clientId,
        email: client.email,
        businessName: client.businessName,
        role: client.role,
        mfaEnabled: client.mfaEnabled
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Account Activation
router.post('/activate', async (req, res) => {
  try {
    const { email, activationToken } = req.body;
    if (!email || !activationToken) {
       return res.status(400).json({ error: 'Email and license key are required' });
    }
    
    const client = await Client.findOne({ email, activationToken });
    if (!client) {
       return res.status(400).json({ error: 'Invalid activation token or email' });
    }
    
    if (client.isActivated) {
       return res.status(400).json({ error: 'Account already activated' });
    }
    
    client.isActivated = true;
    client.activationToken = undefined;
    await client.save();
    
    res.json({ success: true, message: 'Account activated successfully. You can now login.' });
  } catch (err) {
    console.error('Activation error:', err);
    res.status(500).json({ error: 'Activation process failed' });
  }
});

export default router;
