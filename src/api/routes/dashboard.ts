import express from 'express';
import bcrypt from 'bcryptjs';
import { Booking, Contact, Settings, UsageStats, AILog, Client } from '../models';
import { authMiddleware } from '../auth';
import { sendEmail } from '../email';

import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

const router = express.Router();

router.use(authMiddleware);

// Theme Upload
router.post('/upload-theme', async (req, res) => {
  try {
    const clientId = (req as any).user.clientId;
    const { zipBase64 } = req.body;
    
    if (!zipBase64) return res.status(400).json({ error: 'No zip data provided' });

    const themeDir = path.join(process.cwd(), 'themes', clientId);
    if (!fs.existsSync(themeDir)) {
      fs.mkdirSync(themeDir, { recursive: true });
    }

    const zipBuffer = Buffer.from(zipBase64, 'base64');
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(themeDir, true);

    await Settings.findOneAndUpdate({ clientId }, { hasCustomTheme: true });

    res.json({ success: true, message: 'Theme uploaded and extracted successfully' });
  } catch (error) {
    console.error('Theme Upload Error:', error);
    res.status(500).json({ error: 'Upload failed', details: String(error) });
  }
});

// Image Upload
router.post('/upload-image', async (req, res) => {
  try {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image data' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = fileName ? path.extname(fileName) : '.jpg';
    const uniqueName = `img_${Date.now()}${ext}`;
    const filePath = path.join(process.cwd(), 'uploads', uniqueName);

    fs.writeFileSync(filePath, buffer);

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const url = `${protocol}://${host}/uploads/${uniqueName}`;

    res.json({ success: true, url });
  } catch (error) {
    console.error('Image Upload Error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Helper to get clientId
const getCid = (req: any) => req.user.clientId;

// Test SMTP
router.post('/test-email', async (req, res) => {
  try {
    const { email, smtp } = req.body;
    if (!email) return res.status(400).json({ error: 'Recipient email required' });
    
    // For test-email, we use the sender settings from body if provided, 
    // otherwise we use the ones from the database for the current clientId
    const result = await sendEmail(
      email, 
      'SMTP Test Connection', 
      'If you received this, your SMTP settings are working correctly!', 
      undefined, 
      getCid(req),
      smtp
    );
    if (result.success) {
      res.json({ success: true, message: 'Test email sent. Please check your inbox (and spam folder).' });
    } else {
      res.status(500).json({ success: false, error: 'SMTP Authentication Failed', details: result.error });
    }
  } catch (error) {
    console.error('SMTP Test Error:', error);
    res.status(500).json({ error: 'API Error during testing', details: error instanceof Error ? error.message : String(error) });
  }
});

// Setup
router.get('/stats', async (req, res) => {
  try {
    const clientId = getCid(req);
    const client = await Client.findOne({ clientId });
    const totalBookings = await Booking.countDocuments({ clientId });
    const pendingBookings = await Booking.countDocuments({ clientId, status: 'pending' });
    const totalContacts = await Contact.countDocuments({ clientId });
    const unreadContacts = await Contact.countDocuments({ clientId, status: 'unread' });
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let usage = await UsageStats.findOne({ clientId, month: currentMonth });

    res.json({
      totalBookings,
      pendingBookings,
      totalContacts,
      unreadContacts,
      usage: {
        aiMessagesUsed: usage?.aiMessagesUsed || 0,
        aiMessagesLimit: clientId === 'plumber-001' ? 999999999 : (client?.aiMessageLimit || 1000),
        storageBytesUsed: usage?.storageBytesUsed || 0,
        storageBytesLimit: clientId === 'plumber-001' ? 999999999999 : (client?.storageLimitBytes || 52428800)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Bookings
router.get('/bookings', async (req, res) => {
  try {
    console.log('Fetching bookings for CID:', getCid(req));
    const bookings = await Booking.find({ clientId: getCid(req) }).sort({ createdAt: -1 });
    console.log('Bookings found:', bookings.length);
    res.json(bookings);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    res.json(booking);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find({ clientId: getCid(req) }).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.patch('/contacts/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await Contact.findOneAndUpdate({ _id: req.params.id, clientId: getCid(req) }, { status }, { new: true });
    res.json(contact);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

// Settings
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne({ clientId: getCid(req) });
    res.json(settings);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.put('/settings', async (req, res) => {
  try {
    const update = req.body;
    const clientId = getCid(req);
    const settings = await Settings.findOneAndUpdate(
      { clientId },
      { $set: { ...update, clientId } },
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/security', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientId = getCid(req);
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    await Client.findOneAndUpdate({ clientId }, { email, password: hash });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update security' });
  }
});

export default router;
