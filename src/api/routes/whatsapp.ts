import express from 'express';
import { Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { authMiddleware } from '../auth';
import { tenantContextMiddleware } from '../middlewares/tenantContext';

const router = express.Router();

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
  const baseUrl = process.env.APP_URL || 'https://primesoft-operation-suite.onrender.com';
  
  envRes.sendSuccess({
    webhookUrl: `${baseUrl}/api/whatsapp/webhook`
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

router.post('/webhook', async (req, res) => {
  const { entry } = req.body;

  if (!entry || !entry[0] || !entry[0].changes || !entry[0].changes[0].value.metadata) {
    return res.status(200).send('OK'); // Ignore non-message events
  }

  const phoneNumberId = entry[0].changes[0].value.metadata.phone_number_id;

  // Find the tenant by their linked phone number ID
  const client = await Client.findOne({ whatsappPhoneNumberId: phoneNumberId });
  if (!client || !client.whatsappAccessToken) {
    console.warn(`No client found for WhatsApp phone number ID: ${phoneNumberId}`);
    return res.status(200).send('OK');
  }

  const clientId = client.clientId;
  
  const quota = await checkAIQuota(clientId, 1, 'chat');
  if (!quota.allowed) {
    console.warn(`WhatsApp message dropped for ${clientId} due to quota`);
    return res.status(200).send('OK'); 
  }

  await recordAIUsage(clientId, 'chat', 'whatsapp', 'whatsapp', 1, { webhook: true });

  res.status(200).send('OK');
});

router.post('/send', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  envRes.sendSuccess({ status: 'mock_sent' });
});

export default router;
