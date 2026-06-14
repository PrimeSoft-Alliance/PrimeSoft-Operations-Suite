import express from 'express';
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
  const baseUrl = process.env.APP_URL || 'https://primesoft-operation-suite.onrender.com';
  
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

router.post('/webhook', async (req, res) => {
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

  // --- Process AI Chat ---
  // For simplicity, we directly invoke AI logic similar to the chat route
  const settings = await Settings.findOne({ clientId });
  if (settings) {
    // Call the Groq AI API directly
    try {
        const response = await groq.chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [
                { role: 'system', content: `You are the AI assistant for ${client.businessName || 'our business'}. ${settings.aiBehaviorInstructions || 'Be professional and helpful.'}` },
                { role: 'user', content: messageText }
            ],
            temperature: 0.1
        });
        const aiResponse = response.choices[0].message.content || "I'm sorry, I couldn't process that.";
        
        // Send back to user
        await sendWhatsAppMessage(phoneNumberId, client.whatsappAccessToken, senderPhoneNumber, aiResponse);
        await recordAIUsage(clientId, 'chat', 'whatsapp', 'whatsapp', 1, { webhook: true });
    } catch (err) {
        console.error('AI chat error in WhatsApp:', err);
    }
  }

  res.status(200).send('OK');
});

router.post('/send', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  envRes.sendSuccess({ status: 'mock_sent' });
});

export default router;
