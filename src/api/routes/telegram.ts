import express from 'express';
import { Client, Settings } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { authMiddleware } from '../auth';
import { tenantContextMiddleware } from '../middlewares/tenantContext';
import { getGroqClient, DEFAULT_MODEL } from '../utils/ai';
import axios from 'axios';

const router = express.Router();
const groq = getGroqClient();

router.post('/setup', authMiddleware, tenantContextMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { botToken } = req.body;

  if (!clientId || !botToken) return envRes.sendError(400, 'VALIDATION_FAILED', 'Missing token');

  // Register the webhook with Telegram
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      url: `${baseUrl}/v1/telegram/webhook/${clientId}`
    });
  } catch (error: any) {
    console.error('Failed to set Telegram webhook:', error?.response?.data || error);
    return envRes.sendError(500, 'TELEGRAM_ERROR', 'Failed to register webhook with Telegram');
  }

  await Client.updateOne({ clientId }, { telegramBotToken: botToken });
  envRes.sendSuccess({ message: 'Telegram setup complete' });
});

router.post('/webhook/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const client = await Client.findOne({ clientId });
  if (!client || !client.telegramBotToken) {
    return res.status(404).send('Not found');
  }

  if (!req.body || !req.body.message || !req.body.message.text) {
    return res.status(200).send('OK'); // Ignore non-text messages
  }

  const chatId = req.body.message.chat.id;
  const userMessage = req.body.message.text;

  const quota = await checkAIQuota(clientId, 1, 'chat');
  if (!quota.allowed) {
    console.warn(`Telegram message dropped for ${clientId} due to quota`);
    return res.status(200).send('OK'); // Don't fail webhook
  }

  try {
    const { processChatRequest } = await import('../services/chatService');
    const aiResponse = await processChatRequest({
      clientId,
      sessionId: String(chatId),
      message: userMessage,
      userName: String(chatId) // Fallback name
    });

    await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
      chat_id: chatId,
      text: aiResponse
    });

    await recordAIUsage(clientId, 'chat', 'telegram', 'telegram', 1, { webhook: true });
  } catch (err) {
    console.error('AI chat error in Telegram:', err);
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
  if (!client || !client.telegramBotToken) {
    return envRes.sendError(404, 'NOT_FOUND', 'Telegram credentials not configured');
  }

  try {
    await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
      chat_id: to,
      text: message
    });
    await recordAIUsage(clientId, 'chat', 'telegram', 'telegram', 1, { manual: true });
    envRes.sendSuccess({ status: 'sent' });
  } catch (err) {
    console.error('Error sending Telegram message:', err);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to send message');
  }
});

export default router;
