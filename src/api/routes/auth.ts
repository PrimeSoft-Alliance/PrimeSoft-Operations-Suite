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
      status: 'active'
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
