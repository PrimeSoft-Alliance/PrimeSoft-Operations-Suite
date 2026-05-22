import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { validateEnvironment } from './src/api/utils/validateEnv';
import { initializeTierDefinitions } from './src/api/utils/tierSystem';

console.log('--- SERVER.TS LOADED ---');

// Validate environment at startup
validateEnvironment();

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
import ticketsRoutes from './src/api/routes/tickets';
import embedRoutes from './src/api/routes/embed';
import aiContentRoutes from './src/api/routes/ai-content';
import telegramRoutes from './src/api/routes/telegram';
import whatsappRoutes from './src/api/routes/whatsapp';
import { authMiddleware } from './src/api/auth';
import { Client, Settings } from './src/api/models';
import { requestEnvelopeMiddleware } from './src/api/middlewares/envelope';
import { idempotencyMiddleware } from './src/api/middlewares/idempotency';
import { tenantContextMiddleware } from './src/api/middlewares/tenantContext';
import { aiUsageTrackingMiddleware } from './src/api/middlewares/aiUsageTracking';
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

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
    console.error('\n⚠️  FATAL: MongoDB URI is missing or invalid. Please set MONGODB_URI to a valid MongoDB connection string.\n');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
    
    // Ensure indexes are set up for tenant isolation
    try {
      const clientsCollection = mongoose.connection.db?.collection('clients');
      const bookingsCollection = mongoose.connection.db?.collection('bookings');
      const contactsCollection = mongoose.connection.db?.collection('contacts');
      const ailogsCollection = mongoose.connection.db?.collection('ailogs');
      
      // Drop legacy index if exists
      try {
        await clientsCollection?.dropIndex('apiKey_1');
        console.log('  - Dropped legacy apiKey_1 index');
      } catch (e) {
        // ignore
      }
      
      // Ensure tenant isolation indexes
      await clientsCollection?.createIndex({ clientId: 1 }, { unique: true });
      await bookingsCollection?.createIndex({ clientId: 1 });
      await contactsCollection?.createIndex({ clientId: 1 });
      await ailogsCollection?.createIndex({ clientId: 1 });
      console.log('  - Verified tenant isolation indexes');
    } catch (err) {
      console.warn('  - Index setup warning:', err);
    }

    // Initialize tier definitions
    await initializeTierDefinitions();
  } catch (err) {
    console.error('\n⚠️  FATAL: Failed to connect to MongoDB:', err, '\n');
    process.exit(1);
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
  });

  // Ensure Platform Prime exists on start
  try {
    const platformPrimeId = 'platform-prime';
    const client = await Client.findOne({ clientId: platformPrimeId });
    if (!client) {
      console.log('[INIT] Creating Platform Prime client...');
      await Client.create({
        clientId: platformPrimeId,
        businessName: 'Platform Central',
        email: 'central@platform.com',
        password: 'platform_prime_placeholder',
        role: 'superadmin',
        status: 'active',
        apiKey: 'pk_live_platform_prime_' + crypto.randomBytes(8).toString('hex')
      });
    }
    
    const settings = await Settings.findOne({ clientId: platformPrimeId });
    if (!settings) {
      console.log('[INIT] Creating Platform Prime settings...');
      await Settings.create({
        clientId: platformPrimeId,
        businessName: 'Platform Central',
        contactEmail: 'central@platform.com',
        aboutText: 'The central hub for platform operations.',
        services: [
          { name: 'Consultation', description: 'Technical briefing and strategy session.', durationMinutes: 30 }
        ]
      });
    }
  } catch (err) {
    console.error('[INIT] Platform Prime setup error:', err);
  }

  // Apply common middlewares to all /v1 routes
  app.use('/v1', requestEnvelopeMiddleware, idempotencyMiddleware, aiUsageTrackingMiddleware);
  
  // Auth routes (setup, login, etc.) - NO tenant validation needed, they establish identity
  app.use('/v1/auth', authRoutes);
  
  // Public routes - tenant context required but minimal validation
  app.use('/v1/public', tenantContextMiddleware, publicRoutes);
  
  // Protected tenant routes - STRICT tenant isolation
  app.use('/v1/booking', tenantContextMiddleware, bookingRoutes);
  app.use('/v1/bookings', tenantContextMiddleware, bookingRoutes);
  app.use('/v1/contact', tenantContextMiddleware, contactRoutes);
  app.use('/v1/chat', tenantContextMiddleware, chatRoutes);
  app.use('/v1/dashboard', authMiddleware, tenantContextMiddleware, dashboardRoutes);
  app.use('/v1/dashboard/ai', authMiddleware, tenantContextMiddleware, aiContentRoutes);
  app.use('/v1/dashboard/ai', authMiddleware, tenantContextMiddleware, aiRoutes);
  app.use('/v1/forms', tenantContextMiddleware, formsRoutes);
  app.use('/v1/leads', tenantContextMiddleware, leadsRoutes);
  app.use('/v1/content', tenantContextMiddleware, contentRoutes);
  app.use('/v1/media', tenantContextMiddleware, mediaRoutes);
  app.use('/v1/webhooks', tenantContextMiddleware, webhookRoutes);
  app.use('/v1/tickets', tenantContextMiddleware, ticketsRoutes);
  
  // Headless embed routes - tenant resolved but no auth required
  app.use('/v1/embed', tenantContextMiddleware, embedRoutes);
  
  // Bot integration routes - webhook handlers for external platforms
  app.use('/v1/telegram', tenantContextMiddleware, telegramRoutes);
  app.use('/v1/whatsapp', tenantContextMiddleware, whatsappRoutes);
  
  // Super admin routes - different auth pattern
  app.use('/v1/sys-admin', superAdminRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from dist directory
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      index: false, // Don't auto-serve index.html for any path
      maxAge: '1d',
      etag: false
    }));
  }

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

  // SPA fallback: serve index.html for all non-API routes
  // This must be LAST to catch all unmatched routes
  app.get('*', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      const distPath = path.join(process.cwd(), 'dist');
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      // In development, serve index.html to enable SPA routing
      const indexPath = path.join(process.cwd(), 'index.html');
      try {
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          // Fallback HTML that loads React
          res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PrimeSoft Operations Suite</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"><\/script>
</body>
</html>`);
        }
      } catch (err) {
        console.error('[v0] SPA fallback error:', err);
        res.status(500).send('Internal Server Error');
      }
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
