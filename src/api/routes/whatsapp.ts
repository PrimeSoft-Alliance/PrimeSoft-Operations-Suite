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
  const { whatsappPhoneNumber, whatsappBusinessAccountId, whatsappAccessToken } = req.body;

  if (!clientId || !whatsappPhoneNumber || !whatsappAccessToken) {
    return envRes.sendError(400, 'VALIDATION_FAILED', 'Missing credentials');
  }

  await Client.updateOne({ clientId }, { whatsappPhoneNumber, whatsappBusinessAccountId, whatsappAccessToken });
  envRes.sendSuccess({ message: 'WhatsApp setup complete' });
});

router.get('/webhook-url', authMiddleware, tenantContextMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const baseUrl = process.env.APP_URL || 'https://primesoft-operation-suite.onrender.com';
  
  envRes.sendSuccess({
    webhookUrl: `${baseUrl}/api/whatsapp/webhook/${clientId}`
  });
});

router.post('/webhook/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const client = await Client.findOne({ clientId });
  if (!client || !client.whatsappAccessToken) {
    return res.status(404).send('Not found');
  }

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
