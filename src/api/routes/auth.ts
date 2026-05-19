import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Client, Settings } from '../models';

const router = express.Router();
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

router.get('/setup-status', async (req, res) => {
  try {
    const superAdmin = await Client.findOne({ role: 'superadmin' });
    res.json({ setupRequired: !superAdmin });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logic to onboard superadmin using Secret
router.post('/super-admin/onboard', async (req, res) => {
  try {
    const { email, password, secret } = req.body;
    
    // In dev, we can allow based on a secret in env
    const SUPERADMIN_SECRET = process.env.SUPERADMIN_SETUP_SECRET || 'platform_init_secret';
    
    if (secret !== SUPERADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized manual onboarding' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const existing = await Client.findOne({ email });
    if (existing) {
      existing.role = 'superadmin';
      existing.password = hash;
      await existing.save();
      return res.json({ success: true, message: 'User promoted to superadmin' });
    }

    const sa = await Client.create({
      clientId: 'super-admin-' + Math.random().toString(36).substring(7),
      businessName: 'System Admin',
      email,
      password: hash,
      role: 'superadmin',
      status: 'active',
      apiKey: 'api_sa_' + crypto.randomBytes(16).toString('hex')
    });

    res.json({ success: true, clientId: sa.clientId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to onboard superadmin' });
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
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    if (!client.password || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
      apiKey: client.apiKey
    });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;
