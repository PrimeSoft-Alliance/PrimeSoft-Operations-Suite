import express from 'express';
import mongoose from 'mongoose';

console.log('--- SERVER.TS LOADED ---');

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
import formsRoutes from './src/api/routes/forms';
import leadsRoutes from './src/api/routes/leads';
import contentRoutes from './src/api/routes/content';
import mediaRoutes from './src/api/routes/media';
import webhookRoutes from './src/api/routes/webhooks';
import { authMiddleware } from './src/api/auth';
import { Client, Settings } from './src/api/models';
import { requestEnvelopeMiddleware } from './src/api/middlewares/envelope';
import { idempotencyMiddleware } from './src/api/middlewares/idempotency';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get('/health-check', (req, res) => res.json({ status: 'ok' }));
  
  app.set('trust proxy', 1);

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      // Allow all origins for development and known platform domains
      if (!origin || origin.includes('.run.app') || origin.includes('localhost') || origin.includes('aistudio')) {
        callback(null, true);
      } else {
        // Fallback for dynamic sites using the SDK
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id', 'idempotency-key', 'x-api-version', 'x-request-id', 'x-api-key']
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Domain & Theme Middleware
  app.get('/platform-sdk.js', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'themes', 'platform-sdk.js'));
  });

  app.use(async (req, res, next) => {
    try {
      const host = req.hostname;
      
      // LOG ALL REQUESTS
      if (req.url.startsWith('/v1/')) {
        console.log(`[API REQUEST] ${req.method} ${req.url} (Host: ${host})`);
      }

      // Skip for main platform domains OR API routes
      if (host.includes('.run.app') || host.includes('localhost') || host === '0.0.0.0' || host.includes('aistudio') || req.url.startsWith('/v1/') || req.url.startsWith('/api/')) {
        return next();
      }

      if (mongoose.connection.readyState !== 1) {
        console.warn('DB not connected, skipping domain lookup');
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

  app.use('/v1', requestEnvelopeMiddleware, idempotencyMiddleware);
  
  app.use('/v1/public', publicRoutes);
  app.use('/v1/booking', bookingRoutes);
  app.use('/v1/bookings', bookingRoutes);
  app.use('/v1/contact', contactRoutes);
  app.use('/v1/chat', chatRoutes);
  app.use('/v1/auth', authRoutes);
  app.use('/v1/dashboard', dashboardRoutes);
  app.use('/v1/dashboard/ai', authMiddleware, aiRoutes);
  app.use('/v1/super-admin', superAdminRoutes);
  app.use('/v1/forms', formsRoutes);
  app.use('/v1/leads', leadsRoutes);
  app.use('/v1/content', contentRoutes);
  app.use('/v1/media', mediaRoutes);
  app.use('/v1/webhooks', webhookRoutes);

  // Catch unmatched API routes before serving the SPA
  app.use('/v1/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `API route not found: ${req.method} ${req.originalUrl}`
      }
    });
  });

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
