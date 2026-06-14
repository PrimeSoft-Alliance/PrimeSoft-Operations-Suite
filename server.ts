import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';

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
import formsRoutes from './src/api/routes/forms';
import leadsRoutes from './src/api/routes/leads';
import contentRoutes from './src/api/routes/content';
import mediaRoutes from './src/api/routes/media';
import webhookRoutes from './src/api/routes/webhooks';
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

validateEnvironment();

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

  app.get('/widget.js', (req, res) => {
    const host = req.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    const script = `
(function() {
  const scriptTag = document.currentScript;
  const targetDiv = document.getElementById('ai-assistant-widget') || document.getElementById('ominicsr');
  const clientId = targetDiv?.getAttribute('client_id') || targetDiv?.getAttribute('client-id') || scriptTag?.getAttribute('data-client-id') || (new URLSearchParams(window.location.search)).get('clientId') || '';
  
  let detectedBaseUrl = '${baseUrl}';
  if (scriptTag && scriptTag.src) {
    try {
      const url = new URL(scriptTag.src);
      detectedBaseUrl = url.origin;
    } catch(e) {}
  }

  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  
  if (targetDiv) {
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '500px';
    container.style.position = 'relative';
    container.style.borderRadius = '16px';
    container.style.overflow = 'hidden';
    container.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
    container.style.border = '1px solid #e5e7eb';
    
    const iframe = document.createElement('iframe');
    iframe.src = detectedBaseUrl + '/chatbot-mini' + (clientId ? '?clientId=' + clientId : '');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.minHeight = '500px';
    iframe.style.border = 'none';
    iframe.style.display = 'block';
    
    container.appendChild(iframe);
    targetDiv.appendChild(container);
  } else {
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '999999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-end';
    
    const iframe = document.createElement('iframe');
    iframe.src = detectedBaseUrl + '/chatbot-mini' + (clientId ? '?clientId=' + clientId : '');
    iframe.style.width = '380px';
    iframe.style.height = '500px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '16px';
    iframe.style.boxShadow = '0 10px 25px rgba(0,0,0,0.12)';
    iframe.style.display = 'none';
    iframe.style.marginBottom = '10px';
    
    const toggle = document.createElement('button');
    toggle.innerHTML = 'AI Assistant';
    toggle.style.padding = '0 20px';
    toggle.style.height = '50px';
    toggle.style.borderRadius = '25px';
    toggle.style.background = '#6366f1';
    toggle.style.color = 'white';
    toggle.style.border = 'none';
    toggle.style.fontSize = '14px';
    toggle.style.fontWeight = 'bold';
    toggle.style.textTransform = 'uppercase';
    toggle.style.letterSpacing = '0.05em';
    toggle.style.cursor = 'pointer';
    toggle.style.boxShadow = '0 4px 15px rgba(99,102,241,0.3)';
    toggle.style.outline = 'none';
    
    toggle.onclick = () => {
      if (iframe.style.display === 'none') {
        iframe.style.display = 'block';
      } else {
        iframe.style.display = 'none';
      }
    };
    
    container.appendChild(iframe);
    container.appendChild(toggle);
    document.body.appendChild(container);
  }
})();
    `;
    res.set('Content-Type', 'application/javascript');
    res.send(script);
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
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
      await initializeTierDefinitions();
      console.log('Tier definitions initialized');
      try {
        await mongoose.connection.db?.collection('clients').dropIndex('apiKey_1');
        console.log('Dropped legacy apiKey_1 index');
      } catch (e) {
        // ignore
      }
    } catch (err) {
      console.error('\n⚠️  FATAL: Failed to connect to MongoDB:\n', err);
      process.exit(1);
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
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
  app.use('/v1/forms', tenantContextMiddleware, formsRoutes);
  app.use('/v1/leads', tenantContextMiddleware, leadsRoutes);
  app.use('/v1/content', tenantContextMiddleware, contentRoutes);
  app.use('/v1/media', tenantContextMiddleware, mediaRoutes);
  app.use('/v1/webhooks', tenantContextMiddleware, webhookRoutes);
  app.use('/v1/tickets', tenantContextMiddleware, ticketsRoutes);
  app.use('/v1/telegram', telegramRoutes);
  app.use('/v1/whatsapp', whatsappRoutes);
  app.use('/v1/analytics', tenantContextMiddleware, analyticsRoutes);
  
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
