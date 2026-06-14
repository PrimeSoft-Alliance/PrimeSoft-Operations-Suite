import express from 'express';
import { Client, Settings, Lead, Contact } from '../models';
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

  if (!req.body || !req.body.message) {
    return res.status(200).send('OK');
  }

  const { message: tgMessage } = req.body;
  const chatId = tgMessage.chat?.id;
  const userMessage = tgMessage.text || '';
  const contactObj = tgMessage.contact;

  if (!chatId) {
    return res.status(200).send('OK');
  }

  if (!userMessage && !contactObj) {
    return res.status(200).send('OK'); // Ignore other messages types
  }

  const quota = await checkAIQuota(clientId, 1, 'chat');
  if (!quota.allowed) {
    console.warn(`Telegram message dropped for ${clientId} due to quota`);
    return res.status(200).send('OK');
  }

  try {
    const settings = await Settings.findOne({ clientId }) || { clientId, businessName: client.businessName || 'Business' };
    const botName = settings.chatbotTitle || 'Assistant';

    // Fallback info from Telegram message headers
    const tgFirstName = tgMessage.from?.first_name || tgMessage.chat?.first_name || '';
    const tgLastName = tgMessage.from?.last_name || tgMessage.chat?.last_name || '';
    const tgUsername = tgMessage.from?.username || tgMessage.chat?.username || '';
    const tgSessionName = `${tgFirstName} ${tgLastName}`.trim() || (tgUsername ? `@${tgUsername}` : '');

    // 1. Retrieve or create the Lead session matching telegramChatId
    let lead = await Lead.findOne({ clientId, 'data.telegramChatId': String(chatId) });

    if (!lead) {
      lead = await Lead.create({
        clientId,
        contactFirst: tgFirstName || '',
        contactLast: tgLastName || '',
        contactPhone: '',
        contactEmail: '',
        source: 'ai',
        tags: ['telegram', 'ai-chat-lead'],
        data: {
          telegramChatId: String(chatId),
          telegramUsername: tgUsername,
          telegramFirstName: tgFirstName,
          telegramLastName: tgLastName,
          step: 'collect_name'
        }
      });
    }

    if (!lead.data) {
      lead.data = { telegramChatId: String(chatId) };
    }

    // 2. Extract and save phone number if contact shared natively
    if (contactObj) {
      const phoneNumber = contactObj.phone_number;
      const phoneFirstName = contactObj.first_name || '';
      const phoneLastName = contactObj.last_name || '';
      const contactName = `${phoneFirstName} ${phoneLastName}`.trim() || tgSessionName;

      lead.contactPhone = phoneNumber;
      if (!lead.contactFirst || lead.contactFirst === tgUsername || lead.contactFirst === 'Guest') {
        const parts = contactName.split(/\s+/);
        lead.contactFirst = parts[0] || lead.contactFirst;
        lead.contactLast = parts.slice(1).join(' ') || lead.contactLast;
      }
      lead.data.collectedName = contactName;
      lead.markModified('data');
      await lead.save();
      console.log(`[TELEGRAM] Saved native shared contact: Name: ${contactName}, Phone: ${phoneNumber}`);
    }

    // 3. Regex checks for Email & Phone in the message text
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = userMessage.match(emailRegex);
    if (emailMatch) {
      lead.contactEmail = emailMatch[0].toLowerCase().trim();
    }

    const phoneRegex = /(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
    const phoneMatch = userMessage.match(phoneRegex);
    if (phoneMatch) {
      lead.contactPhone = phoneMatch[0].trim();
    }

    // 4. LLM Extraction if details are still incomplete
    const isVerificationMissing = !lead.contactEmail || !lead.data.collectedName;
    if (isVerificationMissing && userMessage && !contactObj) {
      try {
        const extractPrompt = `Analyze the user's message and extract:
1. Email address
2. Full Name (only if they are explicitly introducing or providing their name)
3. Phone number

If any of these are not found, return empty strings. Respond ONLY in strict JSON format:
{
  "name": "extracted full name",
  "email": "extracted email",
  "phone": "extracted phone"
}

Message: "${userMessage}"`;

        const response = await groq.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [{ role: 'user', content: extractPrompt }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        });
        const extracted = JSON.parse(response.choices[0]?.message?.content || '{}');
        if (extracted.email) {
          lead.contactEmail = extracted.email.toLowerCase().trim();
        }
        if (extracted.phone) {
          lead.contactPhone = extracted.phone.trim();
        }
        if (extracted.name) {
          const parts = extracted.name.trim().split(/\s+/);
          lead.contactFirst = parts[0] || lead.contactFirst;
          lead.contactLast = parts.slice(1).join(' ') || lead.contactLast;
          lead.data.collectedName = extracted.name.trim();
        }
        lead.markModified('data');
        await lead.save();
      } catch (e) {
        console.error('[TELEGRAM] LLM detail extraction failed:', e);
      }
    }

    // Onboarding step processing
    const hasName = !!lead.data.collectedName || (lead.contactFirst && lead.contactFirst !== 'Guest' && lead.contactFirst !== tgUsername);
    const hasEmail = !!lead.contactEmail;
    const hasPhone = !!lead.contactPhone;

    let step = lead.data.step;
    if (!step || step === 'completed') {
      if (!hasName) {
        step = 'collect_name';
      } else if (!hasEmail) {
        step = 'collect_email';
      } else if (!hasPhone) {
        step = 'collect_phone';
      } else {
        step = 'completed';
      }
    }

    if (step === 'collect_name') {
      const nameStr = userMessage.trim();
      // Ensure we don't treat command-like messages or trivial inputs as names
      if (!nameStr || nameStr.length < 2 || nameStr.startsWith('/')) {
        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Welcome! I'm ${botName}, the official assistant for ${client.businessName || 'our business'}.\n\nBefore I can assist you, please reply with your **full name**:`
        });
        return res.status(200).send('OK');
      }

      const parts = nameStr.split(/\s+/);
      lead.contactFirst = parts[0] || '';
      lead.contactLast = parts.slice(1).join(' ') || '';
      lead.data.collectedName = nameStr;

      if (!hasEmail) {
        lead.data.step = 'collect_email';
        lead.markModified('data');
        await lead.save();

        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Nice to meet you, ${nameStr}! Next, please provide your **email address**:`
        });
      } else if (!hasPhone) {
        lead.data.step = 'collect_phone';
        lead.markModified('data');
        await lead.save();

        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Got it! Please provide your **phone number** to save:`
        });
      } else {
        lead.data.step = 'completed';
        lead.markModified('data');
        await lead.save();

        const fullName = nameStr;
        await Contact.create({
          clientId,
          name: fullName,
          email: lead.contactEmail,
          phone: lead.contactPhone,
          subject: 'Telegram Contact Collected',
          message: 'Saved directly via Telegram webhook state collection.',
          source: 'telegram'
        }).catch(err => console.error('Error saving contact:', err));

        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Thank you! Your details have been saved successfully. How can I assist you today?`
        });
      }
      return res.status(200).send('OK');
    }

    if (step === 'collect_email') {
      const email = userMessage.trim();
      const emailRegexStrict = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegexStrict.test(email)) {
        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Please enter a valid email address:`
        });
        return res.status(200).send('OK');
      }

      lead.contactEmail = email;

      if (!hasPhone) {
        lead.data.step = 'collect_phone';
        lead.markModified('data');
        await lead.save();

        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Thank you! Lastly, please provide your **phone number** to finalize your profile setup:`
        });
      } else {
        lead.data.step = 'completed';
        lead.markModified('data');
        await lead.save();

        const fullName = lead.data.collectedName || `${lead.contactFirst} ${lead.contactLast || ''}`.trim() || tgSessionName;
        await Contact.create({
          clientId,
          name: fullName,
          email: lead.contactEmail,
          phone: lead.contactPhone,
          subject: 'Telegram Contact Collected',
          message: 'Saved directly via Telegram webhook state collection.',
          source: 'telegram'
        }).catch(err => console.error('Error saving contact:', err));

        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Thank you! Your details have been saved successfully. How can I assist you today?`
        });
      }
      return res.status(200).send('OK');
    }

    if (step === 'collect_phone') {
      const phone = userMessage.trim();
      const cleanPhone = phone.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 5) {
        await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
          chat_id: chatId,
          text: `Please enter a valid phone number:`
        });
        return res.status(200).send('OK');
      }

      lead.contactPhone = phone;
      lead.data.step = 'completed';
      lead.markModified('data');
      await lead.save();

      const fullName = lead.data.collectedName || `${lead.contactFirst} ${lead.contactLast || ''}`.trim() || tgSessionName;
      await Contact.create({
        clientId,
        name: fullName,
        email: lead.contactEmail,
        phone: lead.contactPhone,
        subject: 'Telegram Contact Collected',
        message: 'Saved directly via Telegram webhook state collection.',
        source: 'telegram'
      }).catch(err => console.error('Error saving contact:', err));

      await axios.post(`https://api.telegram.org/bot${client.telegramBotToken}/sendMessage`, {
        chat_id: chatId,
        text: `Thank you! Your details (Name: ${fullName}, Email: ${lead.contactEmail}, Phone: ${lead.contactPhone}) have been saved successfully. How can I assist you today?`
      });
      return res.status(200).send('OK');
    }

    // Always address target as: primary collectedName, fallback tgSessionName (which uses Name or falls back to Username)
    const targetDisplayName = lead.data.collectedName || tgSessionName || 'valued customer';

    // Both name and email are now successfully collected! Procure standard assistant help.
    const { processChatRequest } = await import('../services/chatService');
    const aiResponse = await processChatRequest({
      clientId,
      sessionId: String(chatId),
      message: userMessage,
      userName: targetDisplayName,
      userEmail: lead.contactEmail
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
