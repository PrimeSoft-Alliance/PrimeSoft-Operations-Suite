import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Client, Settings } from '../models';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const seedSuperAdmin = async () => {
  const superAdmin = await Client.findOne({ role: 'superadmin' });
  if (!superAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('superadmin', salt);
    await Client.create({
      clientId: 'super-admin-001',
      businessName: 'System admin',
      email: 'admin@system.com',
      password: hash,
      role: 'superadmin',
      status: 'active',
      apiKey: 'psa_sa_' + Math.random().toString(36).substring(7)
    });
  }

  const demoClient = await Client.findOne({ clientId: 'primesoft-solutions-demo' });
  if (!demoClient) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('client123', salt);
    await Client.create({
      clientId: 'primesoft-solutions-demo',
      businessName: 'PrimeSoft Solutions',
      email: 'client@primesoft.com',
      password: hash,
      role: 'client',
      status: 'active',
      apiKey: 'psa_cl_' + Math.random().toString(36).substring(7)
    });

    // Initialize settings for demo client
    await Settings.create({
      clientId: 'primesoft-solutions-demo',
      businessName: 'PrimeSoft Solutions',
      contactEmail: 'client@primesoft.com',
      aboutText: 'A demo business for PrimeSoft Alliance platform testing.',
      services: [
        { id: '1', name: 'Custom Software Development', description: 'Tailored applications built to solve your unique challenges.', price: 2000, durationMinutes: 120 },
        { id: '2', name: 'Cloud Integration', description: 'Modernizing infrastructure for agility.', price: 1500, durationMinutes: 90 }
      ],
      workingHours: Array.from({ length: 7 }, (_, i) => ({
        day: i,
        isOpen: i > 0 && i < 6,
        openTime: '08:00',
        closeTime: '17:00'
      }))
    });
  }
};

router.post('/login', async (req, res) => {
  try {
    await seedSuperAdmin();
    const { email, password } = req.body;
    
    const client = await Client.findOne({ email });
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
  res.clearCookie('admin_token');
  res.json({ success: true });
});

router.get('/check', async (req, res) => {
  await seedSuperAdmin();
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

export default router;
