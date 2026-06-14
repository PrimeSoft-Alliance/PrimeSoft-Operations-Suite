import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

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
import aiRoutes from './src/api/routes/ai';
import leadsRoutes from './src/api/routes/leads';
import contentRoutes from './src/api/routes/content';
import mediaRoutes from './src/api/routes/media';
import webhookRoutes from './src/api/routes/webhooks';
import notificationsRoutes from './src/api/routes/notifications';
import ticketsRoutes from './src/api/routes/tickets';
import telegramRoutes from './src/api/routes/telegram';
import whatsappRoutes from './src/api/routes/whatsapp';
import analyticsRoutes from './src/api/routes/analytics';

import { authMiddleware } from './src/api/auth';
import { Client, Settings } from './src/api/models';
import { requestEnvelopeMiddleware } from './src/api/middlewares/envelope';
import { idempotencyMiddleware } from './src/api/middlewares/idempotency';
import { tenantContextMiddleware } from './src/api/middlewares/tenantContext';
import { aiUsageTracking } from './src/api/middlewares/aiUsageTracking';
import { validateEnvironment } from './src/api/utils/validateEnv';
import { initializeTierDefinitions } from './src/api/services/quotaService';
import fs from 'fs';

import { createServer } from 'http';
import { Server } from 'socket.io';

validateEnvironment();

let io: Server;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Make io accessible via app.set
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('join', (clientId) => {
      if (clientId) {
        socket.join(clientId);
        console.log(`Socket ${socket.id} joined room: ${clientId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

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
  app.use(express.json({ 
    limit: '50mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(cookieParser());

  // Domain & Theme Middleware
  app.get('/platform-sdk.js', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'themes', 'platform-sdk.js'));
  });

  // Serve widget.js explicitly just in case public folder isn't statically mounted yet
  app.get('/widget.js', (req, res) => {
    const p = path.join(process.cwd(), 'public', 'widget.js');
    if (fs.existsSync(p)) return res.sendFile(p);
    
    // Fallback if built
    const pDist = path.join(process.cwd(), 'dist', 'widget.js');
    if (fs.existsSync(pDist)) return res.sendFile(pDist);
    
    res.status(404).send('Widget script not found');
  });

  app.use(async (req, res, next) => {
    try {
      const host = req.hostname;
      
      // LOG ALL REQUESTS TO CONSOLE AND TO FILE
      if (req.url.startsWith('/v1/')) {
        const logMsg = `[${new Date().toISOString()}] REQUEST: ${req.method} ${req.url} (Host: ${host}, Headers: ${JSON.stringify(req.headers)}, Body: ${JSON.stringify(req.body)})\n`;
        console.log(`[API REQUEST] ${req.method} ${req.url} (Host: ${host})`);
        try {
          fs.appendFileSync(path.join(process.cwd(), 'uploads', 'api_requests.log'), logMsg);
        } catch (e) {
          console.error('Failed to write to requests log file:', e);
        }

        // Intercept response to write the outcome
        const originalEnd = res.end;
        const originalSend = res.send;
        let responseBody = '';
        res.send = function(chunk) {
          if (chunk) {
            responseBody += chunk.toString();
          }
          return originalSend.apply(this, arguments as any);
        };
        res.end = function() {
          const resMsg = `[${new Date().toISOString()}] RESPONSE: ${req.method} ${req.url} - STATUS: ${res.statusCode} - BODY: ${responseBody.substring(0, 1000)}\n`;
          try {
            fs.appendFileSync(path.join(process.cwd(), 'uploads', 'api_requests.log'), resMsg);
          } catch (e) {}
          return originalEnd.apply(this, arguments as any);
        };
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

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date(), db: mongoose.connection.readyState });
  });

  // Apply common middlewares to all /v1 routes
  app.use('/v1', requestEnvelopeMiddleware, idempotencyMiddleware);

  // Auth routes (setup, login, etc.)
  app.use('/v1/auth', authRoutes);
  
  // Other standard API routes WITH tenant enforcement
  app.use('/v1/public', tenantContextMiddleware, publicRoutes);
  app.use('/v1/booking', (req, res, next) => { if (req.method === 'POST') return next(); next('route'); }, tenantContextMiddleware, bookingRoutes);
  app.use('/v1/bookings', (req, res, next) => { if (req.method === 'POST') return next(); next('route'); }, tenantContextMiddleware, bookingRoutes);
  app.use('/v1/contact', (req, res, next) => { if (req.method === 'POST') return next(); next('route'); }, tenantContextMiddleware, contactRoutes);
  app.use('/v1/contacts', (req, res, next) => { if (req.method === 'POST') return next(); next('route'); }, tenantContextMiddleware, contactRoutes);
  app.use('/v1/chat', tenantContextMiddleware, aiUsageTracking, chatRoutes);
  app.use('/v1/leads', tenantContextMiddleware, leadsRoutes);
  app.use('/v1/content', tenantContextMiddleware, contentRoutes);
  app.use('/v1/media', tenantContextMiddleware, mediaRoutes);
  app.use('/v1/webhooks', tenantContextMiddleware, webhookRoutes);
  app.use('/v1/notifications', tenantContextMiddleware, notificationsRoutes);
  app.use('/v1/tickets', tenantContextMiddleware, ticketsRoutes);
  app.use('/v1/telegram', telegramRoutes);
  app.use('/v1/whatsapp', whatsappRoutes);
  app.use('/v1/insights', tenantContextMiddleware, analyticsRoutes);
  
  // Admin Dashboard routes (mounted at root of /v1 after others)
  app.use('/v1/ai', authMiddleware, tenantContextMiddleware, aiUsageTracking, aiRoutes);
  app.use('/v1', authMiddleware, tenantContextMiddleware, dashboardRoutes);

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
      appType: 'spa' as any,
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // START SERVER FIRST
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

  // Then connect to MongoDB connection asynchronously
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
    console.warn('\n⚠️ WARNING: MongoDB URI is missing or invalid. Set MONGODB_URI to enable database features.\n');
  } else {
    mongoose.connect(mongoUri)
      .then(async () => {
        console.log('✅ Connected to MongoDB');
        await initializeTierDefinitions().catch(e => console.error('Failed to init tiers:', e));
        try {
          await mongoose.connection.db?.collection('clients').dropIndex('apiKey_1');
        } catch (e) {}
      })
      .catch(err => {
        console.error('\n⚠️ ERROR: Failed to connect to MongoDB:\n', err);
      });
  }
}

startServer();
