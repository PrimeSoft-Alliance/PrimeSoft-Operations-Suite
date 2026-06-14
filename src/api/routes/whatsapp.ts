import express from 'express';
import crypto from 'crypto';
import { Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { authMiddleware } from '../auth';
import { tenantContextMiddleware } from '../middlewares/tenantContext';
import { getGroqClient, DEFAULT_MODEL } from '../utils/ai';
import { Settings } from '../models'; // Assuming Settings is here or needs to be properly imported
import axios from 'axios';

const router = express.Router();
const groq = getGroqClient();

// Function to send WhatsApp message
async function sendWhatsAppMessage(phoneNumberId: string, accessToken: string, to: string, message: string) {
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  try {
    await axios.post(url, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${to}:`, error);
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

  if (!appSecret) {
    console.warn('WHATSAPP_APP_SECRET is not configured, skipping signature verification.');
    return next();
  }

  if (!signature) {
    return res.status(401).send('Missing signature');
  }

  // Use the raw body captured by the express.json verify callback
  const hmac = crypto.createHmac('sha256', appSecret);
  const digest = Buffer.from(signature.toString().split('=')[1], 'hex');
  const checksum = hmac.update(req.rawBody).digest();

  if (!crypto.timingSafeEqual(digest, checksum)) {
    return res.status(403).send('Invalid signature');
  }
  next();
};

router.post('/webhook', verifySignature, async (req: any, res) => {
  const { entry } = req.body;

  if (!entry || !entry[0] || !entry[0].changes || !entry[0].changes[0].value.metadata) {
    return res.status(200).send('OK'); // Ignore non-message events
  }

  const value = entry[0].changes[0].value;
  const phoneNumberId = value.metadata.phone_number_id;

  if (!value.messages) {
      return res.status(200).send('OK');
  }

  const message = value.messages[0];
  const senderPhoneNumber = message.from;
  const messageText = message.text.body;

  console.log(`Received WhatsApp message from ${senderPhoneNumber} to ${phoneNumberId}: ${messageText}`);

  // Find the tenant by their linked phone number ID
  const client = await Client.findOne({ whatsappPhoneNumberId: phoneNumberId });
  if (!client || !client.whatsappAccessToken) {
    console.warn(`No client found for WhatsApp phone number ID: ${phoneNumberId}`);
    return res.status(200).send('OK');
  }

  const clientId = client.clientId;
  console.log(`Client found: ${clientId}`);
  
  const quota = await checkAIQuota(clientId, 1, 'chat');
  if (!quota.allowed) {
    console.warn(`WhatsApp message dropped for ${clientId} due to quota`);
    return res.status(200).send('OK'); 
  }

  try {
    const settings = await Settings.findOne({ clientId });
    const knowledgeBase = settings?.knowledgeBase || '';

    const { processChatRequest } = await import('../services/chatService');
    const aiResponse = await processChatRequest({
      clientId,
      sessionId: senderPhoneNumber,
      message: messageText,
      userName: senderPhoneNumber,
      knowledgeBase
    });
    
    console.log(`AI response: ${aiResponse}`);
    // Send back to user
    await sendWhatsAppMessage(phoneNumberId, client.whatsappAccessToken, senderPhoneNumber, aiResponse);
    await recordAIUsage(clientId, 'chat', 'whatsapp', 'whatsapp', 1, { webhook: true });
    console.log(`Response sent to ${senderPhoneNumber}`);
  } catch (err) {
      console.error('AI chat error in WhatsApp:', err);
  }

  res.status(200).send('OK');
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
    await sendWhatsAppMessage(client.whatsappPhoneNumberId, client.whatsappAccessToken, to, message);
    await recordAIUsage(clientId, 'chat', 'whatsapp', 'whatsapp', 1, { manual: true });
    envRes.sendSuccess({ status: 'sent' });
  } catch (err) {
    console.error('Error sending WhatsApp message:', err);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to send message');
  }
});

export default router;
