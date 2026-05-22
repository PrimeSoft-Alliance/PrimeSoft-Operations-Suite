import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Client, AIUsageLog, Quota } from '../models';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { enableAITracking } from '../middlewares/aiUsageTracking';
import crypto from 'crypto';

const router = express.Router();

/**
 * WhatsApp webhook handler
 * POST /v1/whatsapp/webhook/:clientId
 * Receives incoming messages from WhatsApp Business API
 */
router.post('/webhook/:clientId', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const { clientId } = req.params;

  try {
    // Verify clientId is valid
    const client = await Client.findOne({ clientId });
    if (!client || !client.whatsappAccessToken) {
      console.warn('[WHATSAPP] Invalid client or missing access token:', clientId);
      return envRes.sendError(404, 'NOT_FOUND', 'WhatsApp not configured for this client');
    }

    const webhookData = req.body;
    
    // Handle webhook verification (Meta sends GET request)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === client.whatsappAccessToken) {
        console.log('[WHATSAPP] Webhook verified');
        return res.status(200).send(challenge);
      } else {
        return res.status(403).send('Verification failed');
      }
    }

    // Process incoming message
    if (!webhookData.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      console.log('[WHATSAPP] No message in webhook');
      return envRes.sendSuccess({ success: true }, 'Webhook received');
    }

    const message = webhookData.entry[0].changes[0].value.messages[0];
    const from = webhookData.entry[0].changes[0].value.contacts?.[0];

    if (!message.text?.body) {
      console.log('[WHATSAPP] Non-text message, skipping');
      return envRes.sendSuccess({ success: true }, 'Webhook received');
    }

    const phoneNumber = message.from;
    const messageText = message.text.body;

    console.log(`[WHATSAPP] Message from ${phoneNumber}: ${messageText}`);

    // Check quota
    const quotaCheck = await checkAIQuota(clientId, 1, 'chat');
    if (!quotaCheck.allowed) {
      console.warn(`[WHATSAPP] Quota exceeded for ${clientId}`);
      await sendWhatsAppMessage(
        client.whatsappAccessToken,
        client.whatsappBusinessAccountId,
        phoneNumber,
        `Error: ${quotaCheck.reason}`
      );
      return envRes.sendSuccess({ success: true }, 'Webhook processed');
    }

    // Check if WhatsApp is enabled for tier
    const quota = await Quota.findOne({ clientId });
    if (!quota?.enabledFeatures?.whatsapp) {
      await sendWhatsAppMessage(
        client.whatsappAccessToken,
        client.whatsappBusinessAccountId,
        phoneNumber,
        'WhatsApp not enabled in your plan'
      );
      return envRes.sendSuccess({ success: true }, 'Webhook processed');
    }

    // Process with AI
    const response = await processMessageWithAI(clientId, messageText, 'whatsapp');

    // Record usage
    enableAITracking(req, 'chat', 'whatsapp', 1, {
      phoneNumber,
      messageLength: messageText.length
    });

    // Send response
    await sendWhatsAppMessage(
      client.whatsappAccessToken,
      client.whatsappBusinessAccountId,
      phoneNumber,
      response
    );

    return envRes.sendSuccess({ success: true }, 'Message processed');
  } catch (err) {
    console.error('[WHATSAPP] Error processing webhook:', err);
    return envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to process message');
  }
});

/**
 * Setup WhatsApp integration
 * POST /v1/whatsapp/setup
 * Requires authentication
 */
router.post('/setup', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;

  try {
    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'clientId required');
    }

    const { accessToken, businessAccountId, phoneNumber, verifyToken } = req.body;

    if (!accessToken || !businessAccountId || !phoneNumber) {
      return envRes.sendError(400, 'BAD_REQUEST', 'accessToken, businessAccountId, and phoneNumber required');
    }

    // Update client
    await Client.updateOne(
      { clientId },
      {
        $set: {
          whatsappAccessToken: accessToken,
          whatsappBusinessAccountId: businessAccountId,
          whatsappPhoneNumber: phoneNumber
        }
      }
    );

    const webhookUrl = `${process.env.PUBLIC_URL || 'https://api.primesoft.com'}/v1/whatsapp/webhook/${clientId}`;

    console.log(`[WHATSAPP] Configured for client ${clientId}`);

    return envRes.sendSuccess(
      {
        webhookUrl,
        phoneNumber,
        businessAccountId: '***'
      },
      'WhatsApp configured successfully'
    );
  } catch (err) {
    console.error('[WHATSAPP] Error setting up:', err);
    return envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to setup WhatsApp');
  }
});

/**
 * Send WhatsApp message
 * POST /v1/whatsapp/send
 * Requires authentication
 */
router.post('/send', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;

  try {
    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'clientId required');
    }

    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return envRes.sendError(400, 'BAD_REQUEST', 'phoneNumber and message required');
    }

    const client = await Client.findOne({ clientId });
    if (!client?.whatsappAccessToken) {
      return envRes.sendError(404, 'NOT_FOUND', 'WhatsApp not configured');
    }

    const result = await sendWhatsAppMessage(
      client.whatsappAccessToken,
      client.whatsappBusinessAccountId,
      phoneNumber,
      message
    );

    return envRes.sendSuccess(result, 'Message sent');
  } catch (err) {
    console.error('[WHATSAPP] Error sending message:', err);
    return envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to send message');
  }
});

/**
 * Helper: Send message via WhatsApp
 */
async function sendWhatsAppMessage(
  accessToken: string,
  businessAccountId: string,
  phoneNumber: string,
  text: string
): Promise<any> {
  try {
    console.log(`[WHATSAPP] Sending to ${phoneNumber}: ${text}`);

    // Real implementation would be:
    // const response = await fetch(
    //   `https://graph.instagram.com/v18.0/${businessAccountId}/messages`,
    //   {
    //     method: 'POST',
    //     headers: { 'Authorization': `Bearer ${accessToken}` },
    //     body: JSON.stringify({
    //       messaging_product: 'whatsapp',
    //       to: phoneNumber,
    //       type: 'text',
    //       text: { body: text }
    //     })
    //   }
    // );
    // return await response.json();

    return { success: true, message_id: crypto.randomUUID() };
  } catch (err) {
    console.error('[WHATSAPP] Error sending message:', err);
    throw err;
  }
}

/**
 * Helper: Process message with AI
 */
async function processMessageWithAI(clientId: string, messageText: string, platform: string): Promise<string> {
  try {
    // Log usage
    await AIUsageLog.create({
      clientId,
      feature: 'chat',
      source: platform,
      platform,
      tokensUsed: Math.ceil(messageText.length / 4),
      responseLength: 0,
      status: 'success'
    });

    // Mock responses
    const responses = [
      'Thank you for reaching out! How can I assist you?',
      'I appreciate your message. What would you like help with?',
      'Great! I\'m here to help. What do you need?',
      'Thanks for contacting us. Let me see how I can help.'
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  } catch (err) {
    console.error('[AI] Error processing message:', err);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

export default router;
