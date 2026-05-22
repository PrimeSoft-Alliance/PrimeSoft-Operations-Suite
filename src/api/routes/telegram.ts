import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Client, AIUsageLog, Quota } from '../models';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { enableAITracking } from '../middlewares/aiUsageTracking';
import crypto from 'crypto';

const router = express.Router();

/**
 * Telegram webhook handler
 * POST /v1/telegram/webhook/:clientId
 * Receives incoming messages from Telegram bot
 */
router.post('/webhook/:clientId', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const { clientId } = req.params;

  try {
    // Verify clientId is valid
    const client = await Client.findOne({ clientId });
    if (!client || !client.telegramBotToken) {
      console.warn('[TELEGRAM] Invalid client or missing bot token:', clientId);
      return envRes.sendError(404, 'NOT_FOUND', 'Telegram bot not configured for this client');
    }

    const message = req.body.message;
    if (!message || !message.text || !message.from) {
      console.log('[TELEGRAM] Skipping non-text update');
      return envRes.sendSuccess({ ok: true }, 'Webhook processed');
    }

    const telegramUserId = message.from.id;
    const messageText = message.text;
    const chatId = message.chat.id;

    console.log(`[TELEGRAM] Message from user ${telegramUserId} in chat ${chatId}: ${messageText}`);

    // Check quota before processing
    const quotaCheck = await checkAIQuota(clientId, 1, 'chat');
    if (!quotaCheck.allowed) {
      console.warn(`[TELEGRAM] Quota check failed for ${clientId}: ${quotaCheck.reason}`);
      // Send error message to Telegram
      await sendTelegramMessage(client.telegramBotToken, chatId, `Error: ${quotaCheck.reason}`);
      return envRes.sendSuccess({ ok: true }, 'Webhook processed');
    }

    // Check if feature is enabled for tier
    const quota = await Quota.findOne({ clientId });
    if (!quota?.enabledFeatures?.webChat) {
      await sendTelegramMessage(client.telegramBotToken, chatId, 'Chat feature not enabled in your plan');
      return envRes.sendSuccess({ ok: true }, 'Webhook processed');
    }

    // Process message with AI (simulated for now)
    const response = await processMessageWithAI(clientId, messageText, 'telegram');

    // Record usage
    enableAITracking(req, 'chat', 'telegram', 1, {
      userId: telegramUserId,
      chatId,
      messageLength: messageText.length
    });

    // Send response back to Telegram
    await sendTelegramMessage(client.telegramBotToken, chatId, response);

    return envRes.sendSuccess({ ok: true }, 'Message processed');
  } catch (err) {
    console.error('[TELEGRAM] Error processing webhook:', err);
    return envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to process message');
  }
});

/**
 * Set Telegram webhook
 * POST /v1/telegram/setup
 * Requires authentication
 */
router.post('/setup', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;

  try {
    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'clientId required');
    }

    const { botToken } = req.body;
    if (!botToken) {
      return envRes.sendError(400, 'BAD_REQUEST', 'botToken required');
    }

    // Verify bot token format
    if (!botToken.match(/^\d+:[A-Za-z0-9_-]{25,}$/)) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Invalid bot token format');
    }

    // Update client with Telegram bot token
    await Client.updateOne(
      { clientId },
      { $set: { telegramBotToken: botToken } }
    );

    // Construct webhook URL
    const webhookUrl = `${process.env.PUBLIC_URL || 'https://api.primesoft.com'}/v1/telegram/webhook/${clientId}`;

    // Set webhook on Telegram (mocked for demo)
    console.log(`[TELEGRAM] Would set webhook URL: ${webhookUrl}`);

    return envRes.sendSuccess(
      { webhookUrl, botToken: '***' },
      'Telegram bot configured successfully'
    );
  } catch (err) {
    console.error('[TELEGRAM] Error setting up bot:', err);
    return envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to setup Telegram bot');
  }
});

/**
 * Send message via Telegram
 * POST /v1/telegram/send
 * Requires authentication
 */
router.post('/send', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;

  try {
    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'clientId required');
    }

    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return envRes.sendError(400, 'BAD_REQUEST', 'chatId and message required');
    }

    const client = await Client.findOne({ clientId });
    if (!client?.telegramBotToken) {
      return envRes.sendError(404, 'NOT_FOUND', 'Telegram bot not configured');
    }

    const result = await sendTelegramMessage(client.telegramBotToken, chatId, message);

    return envRes.sendSuccess(result, 'Message sent');
  } catch (err) {
    console.error('[TELEGRAM] Error sending message:', err);
    return envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to send message');
  }
});

/**
 * Helper: Send message to Telegram
 */
async function sendTelegramMessage(botToken: string, chatId: string | number, text: string): Promise<any> {
  try {
    // This is a mock implementation. In production, use Telegram Bot API
    console.log(`[TELEGRAM] Sending to chat ${chatId}: ${text}`);

    // Real implementation would be:
    // const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ chat_id: chatId, text })
    // });
    // return await response.json();

    return { ok: true, message_id: crypto.randomUUID() };
  } catch (err) {
    console.error('[TELEGRAM] Error sending message:', err);
    throw err;
  }
}

/**
 * Helper: Process message with AI
 */
async function processMessageWithAI(clientId: string, messageText: string, platform: string): Promise<string> {
  try {
    // Log the message
    await AIUsageLog.create({
      clientId,
      feature: 'chat',
      source: platform,
      platform,
      tokensUsed: Math.ceil(messageText.length / 4), // Rough token estimation
      responseLength: 0,
      status: 'success'
    });

    // This is a mock AI response. In production, call the actual AI model
    const mockResponses = [
      'Thanks for your message! How can I help you today?',
      'I understand. Let me assist you with that.',
      'Great question! Here\'s what I can tell you...',
      'I appreciate your inquiry. Let me provide more details.'
    ];

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  } catch (err) {
    console.error('[AI] Error processing message:', err);
    return 'Sorry, I encountered an error processing your message.';
  }
}

export default router;
