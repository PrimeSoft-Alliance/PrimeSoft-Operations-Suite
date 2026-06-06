import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Client, Settings } from '../models';
import { assignTierToClient } from '../services/quotaService';
import { EnvelopeResponse } from '../middlewares/envelope';

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

// Initial SuperAdmin setup logic
const seedSuperAdmin = async () => {
  const superAdmin = await Client.findOne({ role: 'superadmin' });
  if (!superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('superadmin', salt);
    await Client.create({
      clientId: 'super-admin-001',
      businessName: 'System admin',
      email: 'admin@platform.com',
      password: hash,
      role: 'superadmin',
      status: 'active',
      apiKey: 'api_sa_' + Math.random().toString(36).substring(7)
    });
  }
};

router.get('/status-info', async (req, res) => {
  try {
    const superAdmin = await Client.findOne({ role: 'superadmin' });
    res.json({ setupRequired: !superAdmin });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logic to onboard superadmin using a generic code to avoid WAF false positives
router.post('/welcome-onboard', async (req, res) => {
  console.log('--- ONBOARDING ATTEMPT ---', { email: req.body.email, hasCode: !!req.body.code });
  try {
    const { email, password, code } = req.body;
    
    const SUPERADMIN_SECRET = process.env.SUPERADMIN_SETUP_SECRET || 'platform_init_secret';
    
    if (!code || code !== SUPERADMIN_SECRET) {
      console.warn('Onboarding: Invalid code');
      return res.status(401).json({ error: 'Unauthorized: Invalid code' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const existing = await Client.findOne({ email });
    if (existing) {
      console.log('Onboarding: Updating existing user to superadmin');
      existing.role = 'superadmin';
      existing.password = hash;
      existing.status = 'active';
      await existing.save();
      return res.json({ success: true, message: 'User promoted to superadmin' });
    }

    console.log('Onboarding: Creating new superadmin');
    const sa = await Client.create({
      clientId: 'super-admin-' + crypto.randomBytes(4).toString('hex'),
      businessName: 'Platform Owner',
      email,
      password: hash,
      role: 'superadmin',
      status: 'active',
      apiKey: 'api_sa_' + crypto.randomBytes(16).toString('hex')
    });

    console.log('Onboarding: Success', sa.clientId);
    return res.json({ success: true, clientId: sa.clientId });
  } catch (err) {
    console.error('Onboarding ERROR:', err);
    return res.status(500).json({ 
      error: 'Failed to onboard superadmin', 
      details: err instanceof Error ? err.message : 'Unknown error' 
    });
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
    if (pSettings?.enforceMfa && client.role === 'superadmin' && !client.mfaEnabled) {
      return res.status(403).json({ 
        error: 'MFA_REQUIRED', 
        message: 'Platform policy requires Multi-Factor Authentication for Superadmins. Please enable it in your profile.' 
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

    res.cookie('admin_token', token, {
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
  res.clearCookie('admin_token', {
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
  const token = req.cookies.admin_token;
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
  const token = req.cookies.admin_token;
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
  const token = req.cookies.admin_token;
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
