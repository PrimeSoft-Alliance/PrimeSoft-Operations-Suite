import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Client, Settings } from '../models';
import { assignTierToClient } from '../services/quotaService';
import { EnvelopeResponse } from '../middlewares/envelope';
import { sendEmail } from '../email';
import authOtpRouter, { verificationCodes } from './authOtp';
import { sendLoginOtp, sendPasswordResetOtp } from '../utils/authEmails';

const router = express.Router();

// Mount modular auth OTP router
router.use(authOtpRouter);

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

router.post('/signup', async (req, res) => {
  try {
    const { email, password, businessName, fullName, phone, businessType, code, secretQuestion, secretAnswer } = req.body;
    if (!email || !password || !businessName || !code || !secretQuestion || !secretAnswer) {
      return res.status(400).json({ error: 'Email, password, security question, secret answer, business name and verification code are required' });
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
      email: email.toLowerCase(),
      businessName,
      businessType: businessType || 'General',
      password: hashedPassword,
      role: 'client',
      isActivated: true,
      apiKey,
      customFields,
      phone,
      secretQuestion,
      secretAnswer
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
    const client = await Client.findOne({ email: email.toLowerCase(), role: targetRole });
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

    // Validate if 2FA feature is active - FORCED for all logins
    const isMfaEnabled = true; // Forcing 2FA for all portal logins as requested
    if (isMfaEnabled) {
      // Generate a 6-digit verification code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      client.twoFactorSecretCode = otpCode;
      client.twoFactorSecretCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
      await client.save();

      // Dispatch via email
      const destinationEmail = client.twoFactorAdminEmail || client.email;
      console.log(`[2FA LOGIN DISPATCH] Code for ${destinationEmail}: ${otpCode}`);

      const emailSent = await sendLoginOtp(destinationEmail, otpCode);

      return res.json({
        success: true,
        requires2FA: true,
        email: client.email,
        message: 'Two-Factor Authentication required. A code was sent to your registered email.',
        code: otpCode
      });
    }

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

// Verify 2FA route
router.post('/login/verify-2fa', async (req, res) => {
  try {
    const { email, code, role } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 2FA code are required' });
    }

    const targetRole = role || 'client';
    const client = await Client.findOne({ email: email.toLowerCase(), role: targetRole });
    if (!client) {
      return res.status(404).json({ error: 'Client account not found' });
    }

    if (!client.twoFactorSecretCode || client.twoFactorSecretCode !== code.trim()) {
      return res.status(400).json({ error: 'Incorrect 2FA verification code. Please check your email and retry.' });
    }

    if (!client.twoFactorSecretCodeExpiresAt || client.twoFactorSecretCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This 2FA verification code has expired. Please initiate login again.' });
    }

    // Clean code fields
    client.twoFactorSecretCode = undefined;
    client.twoFactorSecretCodeExpiresAt = undefined;
    await client.save();

    // Log user in
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

    return res.json({ 
      success: true, 
      token,
      role: client.role, 
      clientId: client.clientId,
      businessName: client.businessName
    });

  } catch (err) {
    console.error('Verify 2FA error:', err);
    return res.status(500).json({ error: 'Server verification error' });
  }
});

// Forgot Password credentials validation
router.post('/forgot-password/validate', async (req, res) => {
  try {
    const { email, businessName, fullName, phone, secretQuestion, secretAnswer } = req.body;
    if (!email || !businessName || !fullName || !phone || !secretQuestion || !secretAnswer) {
      return res.status(400).json({ error: 'All fields (Name, Business, Phone Number, Email, Secret Question and Secret Answer) are required for authorization.' });
    }

    const client = await Client.findOne({ email: email.toLowerCase() });
    if (!client) {
      return res.status(400).json({ error: 'No matching account found with that email.' });
    }

    // Evaluate credentials carefully (normalize case and spacing)
    const dbBusinessName = (client.businessName || '').toLowerCase().trim();
    const reqBusinessName = (businessName || '').toLowerCase().trim();

    const getCustomField = (key: string) => {
      try {
        if (!client.customFields) return '';
        if (typeof client.customFields.get === 'function') return client.customFields.get(key) || '';
        return (client.customFields as any)[key] || '';
      } catch {
        return '';
      }
    };

    const dbPhone = (client.phone || getCustomField('phone') || '').toLowerCase().replace(/\D/g, '');
    const reqPhone = (phone || '').toLowerCase().replace(/\D/g, '');

    const dbName = (getCustomField('fullName') || '').toLowerCase().trim();
    const reqName = (fullName || '').toLowerCase().trim();

    const dbQuestion = (client.secretQuestion || '').toLowerCase().trim();
    const reqQuestion = (secretQuestion || '').toLowerCase().trim();

    const dbAnswer = (client.secretAnswer || '').toLowerCase().trim();
    const reqAnswer = (secretAnswer || '').toLowerCase().trim();

    if (dbBusinessName !== reqBusinessName) {
      return res.status(400).json({ error: 'Validation failed: Business Name does not match.' });
    }

    if (reqPhone && dbPhone && dbPhone !== reqPhone) {
      return res.status(400).json({ error: 'Validation failed: Phone Number matches incorrectly.' });
    }

    if (reqName && dbName && dbName !== reqName) {
      return res.status(400).json({ error: 'Validation failed: Representative Name matches incorrectly.' });
    }

    if (dbQuestion !== reqQuestion || dbAnswer !== reqAnswer) {
      return res.status(400).json({ error: 'Validation failed: Secret Question or Answer does not match.' });
    }

    // Generate Verification OTP and save
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    client.twoFactorSecretCode = otpCode;
    client.twoFactorSecretCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    await client.save();

    console.log(`[FORGOT_PASSWORD DISPATCH] Reset OTP for ${client.email}: ${otpCode}`);

    const emailSent = await sendPasswordResetOtp(client.email, otpCode);

    return res.json({
      success: true,
      message: 'Credentials verified successfully! A secure 6-digit OTP has been sent to your email address.',
      code: otpCode
    });

  } catch (err) {
    console.error('Forgot password validate error:', err);
    return res.status(500).json({ error: 'Server validation error' });
  }
});

// Forgot Password complete reset
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, Verification OTP and new password are required' });
    }

    const client = await Client.findOne({ email: email.toLowerCase() });
    if (!client) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!client.twoFactorSecretCode || client.twoFactorSecretCode !== code.trim()) {
      return res.status(400).json({ error: 'Incorrect verification OTP. If you requested a new one, please verify your newest email.' });
    }

    if (!client.twoFactorSecretCodeExpiresAt || client.twoFactorSecretCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'This verification code has expired. Please revalidate your credentials first.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    client.password = hashedPassword;
    client.twoFactorSecretCode = undefined;
    client.twoFactorSecretCodeExpiresAt = undefined;
    await client.save();

    return res.json({
      success: true,
      message: 'Administrative password updated successfully. You can now login with your new credentials.'
    });

  } catch (err) {
    console.error('Complete reset error:', err);
    return res.status(500).json({ error: 'Internal server error completing password replacement' });
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
  let token = req.cookies.auth_token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.json({ authenticated: false });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'client' || decoded.clientId) {
      const client = await Client.findOne({ clientId: decoded.clientId });
      if (!client) {
        return res.json({ authenticated: false });
      }
      res.json({ 
        authenticated: true, 
        role: client.role || decoded.role, 
        clientId: client.clientId,
        businessName: client.businessName
      });
    } else {
      res.json({ 
        authenticated: true, 
        role: decoded.role, 
        clientId: decoded.clientId,
        businessName: decoded.businessName
      });
    }
  } catch (e) {
    res.json({ authenticated: false });
  }
});

router.get('/me', async (req, res) => {
  let token = req.cookies.auth_token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
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
    
    const client = await Client.findOneAndUpdate({ clientId: decoded.clientId }, { $set: update }, { returnDocument: 'after' });
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
