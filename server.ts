import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import publicRoutes from './src/api/routes/public';
import bookingRoutes from './src/api/routes/booking';
import contactRoutes from './src/api/routes/contact';
import chatRoutes from './src/api/routes/chat';
import authRoutes from './src/api/routes/auth';
import dashboardRoutes from './src/api/routes/dashboard';
import superAdminRoutes from './src/api/routes/superadmin';
import aiRoutes from './src/api/routes/ai';
import { authMiddleware } from './src/api/auth';
import { Client, Settings } from './src/api/models';
import fs from 'fs';

async function startServer() {

  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Domain & Theme Middleware
  app.get('/platform-sdk.js', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'themes', 'platform-sdk.js'));
  });

  app.use(async (req, res, next) => {
    try {
      const host = req.hostname;
      // Skip for main platform domains
      if (host.includes('.run.app') || host === 'localhost' || host === '0.0.0.0' || host.includes('aistudio')) {
        return next();
      }

      const client = await Client.findOne({ customDomain: host });
      if (client) {
        (req as any).clientId = client.clientId;
        const settings = await Settings.findOne({ clientId: client.clientId });
        
        if (settings?.hasCustomTheme) {
          const themeDir = path.join(process.cwd(), 'themes', client.clientId);
          if (fs.existsSync(themeDir)) {
            // Serve the theme files
            return express.static(themeDir)(req, res, () => {
              // If not found in theme static, serve theme index for SPA-like behavior or specific entry point
              const entry = settings.themeEntryPoint || 'index.html';
              res.sendFile(path.join(themeDir, entry));
            });
          }
        }
      }
      next();
    } catch (err) {
      console.error('Domain Middleware Error:', err);
      next();
    }
  });

  // Connect to MongoDB
  const themesPath = path.join(process.cwd(), 'themes');
  if (!fs.existsSync(themesPath)) {
    fs.mkdirSync(themesPath, { recursive: true });
  }

  const uploadsPath = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsPath));

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
    console.error('\n⚠️  MongoDB URI is missing or invalid. Please set MONGODB_URI to a valid MongoDB connection string.\n');
    mongoose.set('bufferCommands', false);
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });
  
  app.use('/api/public', publicRoutes);
  app.use('/api/booking', bookingRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/dashboard/ai', authMiddleware, aiRoutes);
  app.use('/api/super-admin', superAdminRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
