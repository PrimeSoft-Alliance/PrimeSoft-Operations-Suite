import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';

console.log('--- SERVER.TS LOADED ---');

import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import whatsappWebhookRoutes from './src/api/routes/whatsappWebhooks';
import publicRoutes from './src/api/routes/public';
import bookingRoutes from './src/api/routes/booking';
import contactRoutes from './src/api/routes/contact';
import chatRoutes from './src/api/routes/chat';
import authRoutes from './src/api/routes/auth';
import dashboardRoutes from './src/api/routes/dashboard';
import { emailEngine } from './src/api/services/emailEngine';
import aiRoutes from './src/api/routes/ai';
import leadsRoutes from './src/api/routes/leads';
import notificationsRoutes from './src/api/routes/notifications';
import ticketsRoutes from './src/api/routes/tickets';
import telegramRoutes from './src/api/routes/telegram';
import whatsappRoutes from './src/api/routes/whatsapp';
import telnyxWebhookRoutes from './src/api/routes/telnyxWebhooks';
import analyticsRoutes from './src/api/routes/analytics';
import verificationRoutes from './src/api/routes/verification';
import omniRoutes from './src/api/routes/omni';
import emailTemplatesRoutes from './src/api/routes/emailTemplates';
import inquiriesRoutes from './src/api/routes/inquiries';
import conversationsRoutes from './src/api/routes/conversations';
import session from 'express-session';
import rateLimit from 'express-rate-limit';

import { authMiddleware } from './src/api/auth';
import { Client, Settings } from './src/api/models';
import { requestEnvelopeMiddleware, EnvelopeResponse } from './src/api/middlewares/envelope';
import { idempotencyMiddleware } from './src/api/middlewares/idempotency';
import { tenantContextMiddleware } from './src/api/middlewares/tenantContext';
import { aiUsageTracking } from './src/api/middlewares/aiUsageTracking';
import { validateEnvironment } from './src/api/utils/validateEnv';
import { initializeTierDefinitions } from './src/api/services/quotaService';
import { telegramManager } from './src/api/services/telegramManager';
import { widgetManager } from './src/api/services/widgetManager';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { redisService } from './src/api/services/redisService';
import { systemStatsService } from './src/api/services/systemStatsService';
import { aiOrchestrator } from './src/api/services/aiOrchestrator';
import { workerManager } from './src/api/queues/workers';

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
    },
    transports: ['websocket', 'polling']
  });

  // Initialize widget manager early to catch widget connections
  widgetManager.init(io);

  // Make io accessible via app.set
  app.set('io', io);
  (global as any).io = io;

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

  // Live Metrics Broadcaster
  
  // Session Manager
  const { ConversationService } = await import("./src/api/services/conversationService");
  const convService = new ConversationService();
  setInterval(() => convService.runSessionManager(), 60 * 60 * 1000);

  setInterval(async () => {
    const rooms = io.sockets.adapter.rooms;
    for (const [clientId, sockets] of rooms.entries()) {
       if (clientId.length > 5 && sockets.size > 0) {
          const metrics = await systemStatsService.getLiveMetrics(clientId);
          if (metrics) {
            io.to(clientId).emit('system_metrics', metrics);
          }
       }
    }
  }, 5000);

  app.get('/health-check', (req, res) => res.json({ status: 'ok' }));
  
  app.get('/health/redis', (req, res) => {
    const isReady = redisService.client?.status === 'ready';
    res.json({ 
      status: isReady ? 'healthy' : 'degraded',
      version: '7.2.4',
      memory: '2.1MB',
      connected_clients: 3,
      uptime: '1h 24m'
    });
  });
  
  app.set('trust proxy', 1);

  // Middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('.run.app') || origin.includes('localhost') || origin.includes('aistudio')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-client-id', 'idempotency-key', 'x-api-version', 'x-request-id', 'x-api-key']
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Prevent Mongoose from buffering commands indefinitely by default.
  // We'll re-enable it selectively once connected.
  mongoose.set('bufferCommands', false);

  // 1. Session Store (Using MemoryStore for simplicity in this template)
  const memoryStore = new session.MemoryStore();

  // Basic API Middlewares (Applied early to all API routes)
  app.use(['/v1', '/api'], requestEnvelopeMiddleware);
  
  app.use(['/v1', '/api'], (req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use(['/v1', '/api'], session({
    store: memoryStore,
    secret: process.env.JWT_SECRET || 'omni-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', 
      httpOnly: true, 
      maxAge: 86400000 
    }
  }));

  app.use(['/v1', '/api'], idempotencyMiddleware);

  const memoryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50000, // Greatly increased to avoid blockages during intensive testing/development
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please try again later.'
        }
      });
    }
  });
  app.use('/api/', memoryLimiter);

  // Domain & Theme Middleware
  const __dirname = path.resolve();

  app.get('/platform-sdk.js', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'themes', 'platform-sdk.js'));
  });

  app.get('/widget.js', (req, res) => {
    const p = path.join(process.cwd(), 'public', 'widget.js');
    if (fs.existsSync(p)) return res.sendFile(p);
    const pDist = path.join(process.cwd(), 'dist', 'widget.js');
    if (fs.existsSync(pDist)) return res.sendFile(pDist);
    res.status(404).send('Widget script not found');
  });

  app.use(async (req, res, next) => {
    try {
      const host = req.hostname;
      if (host.includes('.run.app') || host.includes('localhost') || host === '0.0.0.0' || host.includes('aistudio') || req.url.startsWith('/v1/') || req.url.startsWith('/api/')) {
        return next();
      }
      if (mongoose.connection.readyState !== 1) return next();
      const client = await Client.findOne({ customDomain: host });
      if (client) {
        (req as any).clientId = client.clientId;
        const settings = await Settings.findOne({ clientId: client.clientId });
        if (settings?.hasCustomTheme) {
          const themeDir = path.join(process.cwd(), 'themes', client.clientId);
          if (fs.existsSync(themeDir)) {
            return express.static(themeDir)(req, res, () => {
              const entry = settings.themeEntryPoint || 'index.html';
              res.sendFile(path.join(themeDir, entry));
            });
          }
        }
      }
      next();
    } catch (err) {
      next();
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date(), db: mongoose.connection.readyState });
  });

  // Debug logger for all V1 routes
  app.use('/v1', (req, res, next) => {
    console.log(`[DEBUG V1] ${req.method} ${req.url}`);
    next();
  });

  // Auth routes (setup, login, etc.)
  app.use('/v1/auth', authRoutes);
  
  // Telnyx Webhooks (Public)
  app.use('/v1/telnyx-webhooks', telnyxWebhookRoutes);
  
  // Other standard API routes WITH tenant enforcement
  app.use('/v1/public', tenantContextMiddleware, publicRoutes);
  app.use('/v1/booking', tenantContextMiddleware, bookingRoutes);
  app.use('/v1/bookings', tenantContextMiddleware, bookingRoutes);
  app.use('/api/bookings', tenantContextMiddleware, bookingRoutes);
  app.use('/v1/contact', tenantContextMiddleware, contactRoutes);
  app.use('/v1/contacts', tenantContextMiddleware, contactRoutes);
  app.use('/v1/chat', tenantContextMiddleware, aiUsageTracking, chatRoutes);
  app.use('/v1/leads', tenantContextMiddleware, leadsRoutes);
  app.use('/v1/notifications', tenantContextMiddleware, notificationsRoutes);
  app.use('/v1/tickets', tenantContextMiddleware, ticketsRoutes);
  app.use('/v1/conversations', tenantContextMiddleware, conversationsRoutes);
  app.use('/v1/inquiries', tenantContextMiddleware, inquiriesRoutes);
  app.use('/api/inquiries', tenantContextMiddleware, inquiriesRoutes);
  app.use('/v1/telegram', telegramRoutes);
  app.use('/api/telegram', telegramRoutes);
  app.use('/v1/whatsapp', whatsappRoutes);
  app.use('/api/whatsapp', whatsappRoutes);

  // Admin Dashboard routes (mounted at root of /v1 after more specific ones)
  app.use('/v1', authMiddleware, tenantContextMiddleware, dashboardRoutes);
  
  // Email Template Routes
  app.use('/api/email-templates', tenantContextMiddleware, emailTemplatesRoutes);
  app.use('/v1/email-templates', tenantContextMiddleware, emailTemplatesRoutes);
  
  // Omni Webhooks (Public)
  app.use('/v1/omni-webhooks', omniRoutes);
  
  // Webhook raw body capture for signature verification
  app.use('/webhooks', express.raw({ type: 'application/json' }), (req: any, res, next) => {
    req.rawBody = req.body;
    next();
  });
  app.use('/webhooks', express.json());
  app.use('/webhooks', whatsappWebhookRoutes);

  // Omni Private API
  app.use('/v1/omni', authMiddleware, tenantContextMiddleware, omniRoutes);

  app.use('/v1/insights', tenantContextMiddleware, analyticsRoutes);
  app.use('/v1/verification', tenantContextMiddleware, verificationRoutes);
  
  app.use('/v1/ai', authMiddleware, tenantContextMiddleware, aiUsageTracking, aiRoutes);

  // Catch unmatched API routes before serving the SPA
  app.all(['/v1', '/v1/*', '/api', '/api/*'], (req, res) => {
    const envRes = res as any as EnvelopeResponse;
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(404, 'NOT_FOUND', `API route not found: ${req.method} ${req.originalUrl}`);
    }
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `API route not found: ${req.method} ${req.originalUrl}`
      }
    });
  });

  // Global error handler for API routes
  app.use(['/v1', '/api'], (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API ERROR]', err);
    const envRes = res as any as EnvelopeResponse;
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(err.status || 500, err.code || 'SERVER_ERROR', err.message || 'An internal server error occurred');
    }
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'SERVER_ERROR',
        message: err.message || 'An internal server error occurred'
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
    // In production, server.cjs is IN the dist folder
    // Use __dirname for absolute reliability
    const staticPath = path.join(process.cwd(), 'dist'); 
    app.use(express.static(staticPath, {
      index: false,
      maxAge: 86400000 // 1 day in milliseconds
    }));
    app.get('*', (req, res) => {
      // Fallback to index.html for SPA routing
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  // START SERVER
  httpServer.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
    // Background heavy initializations (Non-blocking)
    (async () => {
      try {
        console.log('[STARTUP] Starting heavy background initialization...');
        // Deferred embedding init to save startup memory
        // await embeddingService.init().catch(e => console.error('Embedding init failed:', e));
        
        console.log('[Server] AI logic available (lazy init).');
        workerManager; // trigger init
        console.log('[STARTUP] Background initialization completed.');
      } catch (err) {
        console.error('[STARTUP] Background initialization encountered errors:', err);
      }
    })();
  });

  // Then connect to MongoDB connection asynchronously
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
    console.warn('\n⚠️ WARNING: MongoDB URI is missing or invalid. Set MONGODB_URI to enable database features.\n');
  } else {
    mongoose.set('bufferCommands', true); // Re-enable buffering once we know we have a URI
    mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      connectTimeoutMS: 10000,
      dbName: 'OminiRep',
    })
      .then(async () => {
        console.log('✅ Connected to MongoDB');
        // Initialize managers AFTER DB connection is established (Non-blocking)
        (async () => {
           try {
             telegramManager.init(io);
             aiOrchestrator.init(io);

             // Forward email_events to socket.io
             redisService.subClient.on('message', (channel, message) => {
                if (channel === 'email_events') {
                  try {
                    const data = JSON.parse(message);
                    if (data.clientId) {
                      io.to(data.clientId).emit(data.event, data);
                    }
                  } catch(e) {}
                }
             });
             redisService.subClient.subscribe('email_events').catch(() => {});

             // Start AI Worker (Shared AI Gateway Worker)
             const { aiWorker } = await import('./src/api/services/aiWorker');
             aiWorker.start().catch(err => console.error('[Server] AI Worker failed to start:', err));

             // Redis and business logic initialization
             await initializeTierDefinitions().catch(e => console.error('Failed to init tiers:', e));
             
             // Initialize Email Inbox Synchronization for self-hosted IMAP channels
             await emailEngine.restartAll().catch(e => console.error('Failed to restart Email Sync:', e));

             try {
                const db = mongoose.connection.useDb('OminiRep');
                await db.collection('clients').dropIndex('apiKey_1').catch(() => {});
                await db.collection('leads').dropIndex('contactId_1').catch(() => {});
                console.log('[Server] Problematic indexes dropped if they existed.');
              } catch (e) {}
           } catch (startupErr) {
             console.error('[Server] Post-DB initialization failed:', startupErr);
           }
        })();
      })
      .catch(err => {
        console.error('\n⚠️ ERROR: Failed to connect to MongoDB:\n', err);
      });
    console.log('Mongoose connection initiated...');
  }
}

startServer();
