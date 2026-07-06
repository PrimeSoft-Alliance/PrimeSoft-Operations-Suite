import express from 'express';
import { Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';

const router = express.Router();

router.post('/setup', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { botToken } = req.body;

  if (!clientId || !botToken) return envRes.sendError(400, 'VALIDATION_FAILED', 'Missing token');

  await Client.updateOne({ clientId }, { telegramBotToken: botToken });
  envRes.sendSuccess({ message: 'Telegram setup complete' });
});

router.post('/webhook/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const client = await Client.findOne({ clientId });
  if (!client || !client.telegramBotToken) {
    return res.status(404).send('Not found');
  }

  const quota = await checkAIQuota(clientId, 1, 'chat');
  if (!quota.allowed) {
    console.warn(`Telegram message dropped for ${clientId} due to quota`);
    return res.status(200).send('OK'); // Don't fail webhook
  }

  // Handle telegram message and send response using client.telegramBotToken
  // (In a real scenario, invoke Groq API here)
  await recordAIUsage(clientId, 'chat', 'telegram', 'telegram', 1, { webhook: true });

  res.status(200).send('OK');
});

router.post('/send', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  envRes.sendSuccess({ status: 'mock_sent' });
});

export default router;
