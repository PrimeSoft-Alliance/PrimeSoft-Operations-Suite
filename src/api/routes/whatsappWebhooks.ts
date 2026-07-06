import express from 'express';
import { WhatsAppService } from '../services/whatsappService';
import { Client, Conversation } from '../models';
import { aiOrchestrator } from '../services/aiOrchestrator';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// GET /webhooks/whatsapp (Meta Verification)
router.get('/whatsapp', (req: any, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe') {
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return res.status(403).send('Forbidden');
    }
    return res.status(200).send(challenge);
  }
  res.status(200).send('OK');
});

// Hook handler
const handleWebhookPost = async (req: any, res: any) => {
  const signature = req.headers['x-hub-signature-256'];
  let channelId = req.headers['x-channel-id'] || req.query.channelId;
  const rawBody = req.rawBody?.toString();

  let from = '';
  let contactName = '';
  let content = '';
  let mediaBuffer: Buffer | null = null;
  let mimeType = '';

  let bodyObj = req.body;
  if (Buffer.isBuffer(bodyObj) || typeof bodyObj === 'string') {
    try {
      bodyObj = JSON.parse(bodyObj.toString());
    } catch (e) {}
  }

  // Parse Meta official payload
  if (bodyObj && bodyObj.object === 'whatsapp_business_account' && bodyObj.entry) {
    try {
      const entry = bodyObj.entry[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];
      const contactObj = value?.contacts?.[0];
      
      if (message) {
        from = message.from;
        contactName = contactObj?.profile?.name || from;
        channelId = channelId || value?.metadata?.phone_number_id;

        // Fetch client BEFORE processing messages to use accessToken
        let client = await Client.findOne({ whatsappPhoneNumberId: channelId || { $ne: null } });
        if (!client) return res.status(200).send('OK');

        if (message.type === 'text') {
          let replyPrefix = '';
          if (message.context && message.context.id) {
            try {
              const { Conversation } = await import('../models');
              const lastConv = await Conversation.findOne({ clientId: client.clientId, customerJid: from });
              if (lastConv && lastConv.messages && lastConv.messages.length > 0) {
                const lastAssistantMsg = [...lastConv.messages].reverse().find(m => m.sender === 'assistant');
                if (lastAssistantMsg) {
                  replyPrefix = `[Replying to Agent's message: "${lastAssistantMsg.text}"]\n`;
                }
              }
            } catch (replyErr) {
              console.error('[WhatsApp Webhook] Failed to resolve reply context:', replyErr);
            }
          }
          content = replyPrefix + (message.text?.body || '');
        } else if (message.type === 'image') {
          const imageId = message.image?.id;
          if (imageId) {
            try {
              const mediaUrlRes = await axios.get(`https://graph.facebook.com/v19.0/${imageId}`, {
                headers: { Authorization: `Bearer ${client.whatsappAccessToken}` }
              });
              const mediaUrl = mediaUrlRes.data?.url;
              if (mediaUrl) {
                const mediaDataRes = await axios.get(mediaUrl, {
                  headers: { Authorization: `Bearer ${client.whatsappAccessToken}` },
                  responseType: 'arraybuffer'
                });
                const buffer = Buffer.from(mediaDataRes.data);
                const publicPath = path.join(process.cwd(), 'public', 'uploads');
                if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
                const safeName = `${Date.now()}-wa-image.jpg`;
                const filePath = path.join(publicPath, safeName);
                fs.writeFileSync(filePath, buffer);
                const localUrl = `/uploads/${safeName}`;
                content = message.image?.caption || 'User sent an image';
                (req as any).waImageUrl = localUrl;
              }
            } catch (err) {
              console.error('[WhatsApp Webhook] Media download failed:', err);
              content = `[User sent an image but it couldn't be downloaded]`;
            }
          }
        } else {
          content = `[User sent a ${message.type} but the system is currently text-only]`;
        }
      }
    } catch (e) {
      console.error('[WhatsApp Webhook] Error parsing Meta payload:', e);
    }
  }

  if (!from) return res.status(200).send('OK');

  let client = await Client.findOne({ whatsappPhoneNumberId: channelId || { $ne: null } });
  if (!client) return res.status(200).send('OK');

  const waImageUrl = (req as any).waImageUrl;

  // Verify signature
  const webhookSecret = client.whatsappBusinessAccountId || process.env.WHATSAPP_ACCESS_TOKEN;
  if (webhookSecret && rawBody && signature) {
    if (!WhatsAppService.verifySignature(rawBody, signature, webhookSecret)) {
      return res.status(401).send('Invalid signature');
    }
  }

  // Save to conversation
  let conv = await Conversation.findOne({ clientId: client.clientId, customerJid: from });
  if (!conv) {
    conv = new Conversation({
      clientId: client.clientId,
      customerJid: from,
      customerName: contactName,
      platform: 'whatsapp',
      messages: []
    });
  }
  
  conv.messages.push({ sender: 'customer', text: content, imageUrl: waImageUrl, timestamp: new Date() });
  await conv.save();

  // Trigger AI response
  try {
    const aiResult = await aiOrchestrator.processMessage({
      clientId: client.clientId,
      sessionId: from,
      platform: 'whatsapp',
      message: content,
      imageUrl: waImageUrl,
      userId: from,
      chatId: from
    });

    if (aiResult && aiResult.response) {
      await WhatsAppService.sendMessage(channelId as string, from, aiResult.response, [], client.whatsappAccessToken);
      
      // Log response
      conv.messages.push({ sender: 'assistant', text: aiResult.response, imageUrl: aiResult.imageUrl || undefined, timestamp: new Date() });
      await conv.save();
    }
  } catch (err) {
    console.error('[WhatsApp Webhook] AI Trigger Error:', err);
  }

  res.status(200).send('OK');
};

router.post('/whatsapp', handleWebhookPost);

export default router;
