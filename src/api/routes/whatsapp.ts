import express from 'express';
import crypto from 'crypto';
import { Client, Settings, Lead, Notification } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { authMiddleware } from '../auth';
import { tenantContextMiddleware } from '../middlewares/tenantContext';
import { getGroqClient, DEFAULT_MODEL } from '../utils/ai';
import { emitToClient } from '../utils/socket';
import axios from 'axios';

const router = express.Router();
const groq = getGroqClient();

// Function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, message: string) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`; 
  try {
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });
    console.log(`[WhatsApp Outbound] Successfully sent to ${to}. ID: ${response.data.messages?.[0]?.id}`);
    return true;
  } catch (error: any) {
    const errorData = error.response?.data || error.message;
    console.error(`[WhatsApp Outbound] FAILED to send to ${to}:`, JSON.stringify(errorData));
    if (error.response?.data?.error?.code === 100 && error.response?.data?.error?.error_subcode === 2494010) {
      console.warn('CRITICAL: Recipient number not verified in Meta Dashboard.');
    }
    return false;
  }
}

router.post('/setup', authMiddleware, tenantContextMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { whatsappPhoneNumberId, whatsappBusinessAccountId, whatsappAccessToken } = req.body;

  if (!clientId || !whatsappPhoneNumberId || !whatsappAccessToken) {
    return envRes.sendError(400, 'VALIDATION_FAILED', 'Missing credentials');
  }

  await Client.updateOne({ clientId }, { whatsappPhoneNumberId, whatsappBusinessAccountId, whatsappAccessToken });
  envRes.sendSuccess({ message: 'WhatsApp setup complete' });
});

router.get('/webhook-url', authMiddleware, tenantContextMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  
  envRes.sendSuccess({
    webhookUrl: `${baseUrl}/v1/whatsapp/webhook`
  });
});

// Webhook verification endpoint (GET)
router.get('/webhook', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verification token is now global for the app
  if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'verify_me')) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Middleware to verify Meta signature
const verifySignature = (req: any, res: express.Response, next: express.NextFunction) => {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret || process.env.NODE_ENV !== 'production') {
    if (!appSecret) console.warn('WHATSAPP_APP_SECRET is not configured, skipping signature verification.');
    return next();
  }

  if (!signature) {
    console.warn('Incoming WhatsApp webhook missing x-hub-signature-256 header.');
    return res.status(401).send('Missing signature');
  }

  try {
    // Use the raw body captured by the express.json verify callback
    const hmac = crypto.createHmac('sha256', appSecret);
    const signatureParts = signature.toString().split('=');
    if (signatureParts.length < 2) return res.status(400).send('Invalid signature format');
    
    const digest = Buffer.from(signatureParts[1], 'hex');
    const checksum = hmac.update(req.rawBody).digest();

    if (!crypto.timingSafeEqual(digest, checksum)) {
      console.warn('Invalid WhatsApp signature detected.');
      return res.status(403).send('Invalid signature');
    }
  } catch (err) {
    console.error('Error verifying WhatsApp signature:', err);
    return res.status(500).send('Signature verification error');
  }
  next();
};

router.post('/webhook', verifySignature, async (req: any, res) => {
  const { entry } = req.body;

  if (!entry || !entry[0] || !entry[0].changes || !entry[0].changes[0].value) {
    return res.status(200).send('OK');
  }

  const value = entry[0].changes[0].value;
  const metadata = value.metadata;
  
  if (!metadata || !metadata.phone_number_id) {
    return res.status(200).send('OK');
  }

  const phoneNumberId = metadata.phone_number_id;
  
  if (!value.messages || !value.messages[0]) {
      return res.status(200).send('OK');
  }

  const message = value.messages[0];
  const senderPhoneNumber = message.from;
  
  if (message.type !== 'text' || !message.text) {
    return res.status(200).send('OK');
  }

  const messageText = message.text.body;

  // 1. Send immediate 200 OK to Meta to prevent timeout/retries
  res.status(200).send('OK');

  // 2. Process AI and reply in the background
  (async () => {
    try {
      console.log(`[WhatsApp BG] Processing message from ${senderPhoneNumber}...`);
      
      const client = await Client.findOne({ whatsappPhoneNumberId: phoneNumberId });
      if (!client || !client.whatsappAccessToken) {
        console.error(`[WhatsApp BG] No client found for WhatsApp ID: ${phoneNumberId}`);
        return;
      }

      const clientId = client.clientId;
      const quota = await checkAIQuota(clientId, 1, 'chat');
      if (!quota.allowed) {
        console.warn(`[WhatsApp BG] Quota reached for ${clientId}. Message dropped.`);
        return; 
      }

      const settings = await Settings.findOne({ clientId });
      const knowledgeBase = settings?.knowledgeBase || '';

      console.log(`[WhatsApp BG] Invoking AI for ${clientId}...`);
      const { processChatRequest } = await import('../services/chatService');
      const aiResponse = await processChatRequest({
        clientId,
        sessionId: senderPhoneNumber,
        message: messageText,
        userName: senderPhoneNumber,
        knowledgeBase
      });
      
      console.log(`[WhatsApp BG] AI response success. Sending outbound...`);
      const sent = await sendWhatsAppMessage(phoneNumberId, client.whatsappAccessToken, senderPhoneNumber, aiResponse);
      if (sent) {
        await recordAIUsage(clientId, 'chat', 'whatsapp', 'whatsapp', 1, { webhook: true });
        
        // Log activity if it's a lead
        try {
          const lead = await Lead.findOne({ clientId, contactPhone: { $regex: new RegExp(senderPhoneNumber.replace('+', ''), 'i') } });
          if (lead) {
            lead.activities.push({
              type: 'whatsapp',
              description: `WhatsApp Message Received: ${messageText}`,
              date: new Date(),
              metadata: { body: messageText, incoming: true, platform: 'whatsapp' }
            });
            lead.activities.push({
              type: 'whatsapp',
              description: `AI Response Sent: ${aiResponse}`,
              date: new Date(),
              metadata: { body: aiResponse, incoming: false, bot: true, platform: 'whatsapp' }
            });
            lead.lastActivity = new Date();
            await lead.save();

            const mockReq = { app: req.app, clientId } as any;
            emitToClient(mockReq, 'activity_update', { leadId: lead._id, activity: lead.activities[lead.activities.length - 1] });
          }
        } catch (err) {}

        console.log(`[WhatsApp BG] Successfully replied to ${senderPhoneNumber}`);
      } else {
        console.error(`[WhatsApp BG] Failed to send reply to ${senderPhoneNumber}`);
      }
    } catch (err) {
        console.error('[WhatsApp BG] Background Processing Error:', err);
    }
  })();
});

router.post('/send', authMiddleware, tenantContextMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { to, message } = req.body;

  if (!clientId || !to || !message) {
    return envRes.sendError(400, 'VALIDATION_FAILED', 'Missing required fields');
  }

  const client = await Client.findOne({ clientId });
  if (!client || !client.whatsappPhoneNumberId || !client.whatsappAccessToken) {
    return envRes.sendError(404, 'NOT_FOUND', 'WhatsApp credentials not configured for this client');
  }

  try {
    const sent = await sendWhatsAppMessage(client.whatsappPhoneNumberId, client.whatsappAccessToken, to, message);
    if (!sent) throw new Error('WhatsApp delivery failed');

    await recordAIUsage(clientId, 'chat', 'whatsapp', 'whatsapp', 1, { manual: true });
    
    // Log activity if lead exists
    try {
      const lead = await Lead.findOne({ clientId, contactPhone: { $regex: new RegExp(to.replace('+', ''), 'i') } });
      if (lead) {
        lead.activities.push({
          type: 'whatsapp',
          description: `WhatsApp Message Sent: ${message.substring(0, 50)}...`,
          date: new Date(),
          metadata: { body: message, incoming: false, platform: 'whatsapp' }
        });
        lead.lastActivity = new Date();
        await lead.save();
        emitToClient(req, 'activity_update', { leadId: lead._id, activity: lead.activities[lead.activities.length - 1] });
      }
    } catch (err) {}

    envRes.sendSuccess({ status: 'sent' });
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to send message');
  }
});

export default router;
