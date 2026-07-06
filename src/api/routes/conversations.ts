import express from 'express';
import { Conversation, Contact, Lead } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';
import { UnifiedLeadResolver } from '../services/conversationService';

const router = express.Router();

router.use(authMiddleware);

const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  let queryCid = req.query.clientId;
  let headerCid = req.headers['x-client-id'];
  
  if (typeof queryCid === 'object' && queryCid !== null && 'clientId' in queryCid) queryCid = queryCid.clientId;
  if (typeof headerCid === 'object' && headerCid !== null && 'clientId' in headerCid) headerCid = headerCid.clientId;

  let cid = userCid || reqCid || headerCid || queryCid;
  if (!cid) return null;
  return String(cid);
};

// GET /v1/conversations - List all unified conversations
router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const conversations = await Conversation.find({ clientId }).sort({ updatedAt: -1 }).lean();
    envRes.sendSuccess(conversations);
  } catch (error: any) {
    console.error('[CONVERSATIONS_FETCH] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch conversations', error.message);
  }
});

// GET /v1/conversations/:id - Get specific conversation details
router.get('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, clientId }).lean();
    if (!conversation) return envRes.sendError(404, 'NOT_FOUND', 'Conversation not found');
    envRes.sendSuccess(conversation);
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch conversation', error.message);
  }
});

// POST /v1/conversations/:id/messages - Send a message
router.post('/:id/messages', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  const { text, channel, imageUrl } = req.body;

  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (!text) return envRes.sendError(400, 'BAD_REQUEST', 'Message text is required');

  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, clientId });
    if (!conversation) return envRes.sendError(404, 'NOT_FOUND', 'Conversation not found');

    const platform = channel || conversation.platform;

    // Send via appropriate manager
    if (platform === 'whatsapp') {
      const { conversationService } = await import('../services/conversationService');
      await conversationService.sendOutbound({
        clientId,
        contactId: conversation.contactId?.toString() || '',
        channel: 'whatsapp',
        text
      });
    } else if (platform === 'telegram') {
      const { telegramManager } = await import('../services/telegramManager');
      await telegramManager.sendMessage(clientId, conversation.customerJid, { text });
    } else if (platform === 'sms') {
      const { telnyxService } = await import('../services/telnyxService');
      const contact = await Contact.findOne({ clientId, $or: [{ phone: conversation.customerJid }, { email: conversation.customerEmail }] });
      if (contact?.phone) {
        await telnyxService.sendSMS(clientId, 'OMNIREP', contact.phone, text);
      }
    } else if (platform === 'email') {
      const { sendSupportEmail } = await import('../services/emailSupportService');
      const contact = await Contact.findOne({ clientId, $or: [{ email: conversation.customerJid }, { email: conversation.customerEmail }] });
      if (contact?.email) {
        await sendSupportEmail(clientId, contact.email, 'Reply from Support', text);
      }
    }

    // Save to DB
    const newMessage = {
      sender: 'assistant',
      text,
      imageUrl: imageUrl || undefined,
      timestamp: new Date()
    };
    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date();
    await conversation.save();

    envRes.sendSuccess(newMessage);
  } catch (error: any) {
    console.error('[CONVERSATION_SEND] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to send message', error.message);
  }
});

// PATCH /v1/conversations/:id/ai - Toggle AI for a conversation and linked contact
router.patch('/:id/ai', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  const { aiEnabled } = req.body;

  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (aiEnabled === undefined) return envRes.sendError(400, 'BAD_REQUEST', 'aiEnabled parameter is required');

  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, clientId });
    if (!conversation) return envRes.sendError(404, 'NOT_FOUND', 'Conversation not found');

    conversation.aiEnabled = aiEnabled;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Link and update the contact's aiEnabled if contact exists
    const contact = await Contact.findOne({ 
      clientId, 
      $or: [
        { phone: conversation.customerJid }, 
        { email: conversation.customerEmail },
        { telegramChatId: conversation.customerJid },
        { whatsappJid: conversation.customerJid }
      ] 
    });
    if (contact) {
      contact.aiEnabled = aiEnabled;
      await contact.save();
    }

    envRes.sendSuccess({ success: true, aiEnabled: conversation.aiEnabled });
  } catch (error: any) {
    console.error('[CONVERSATION_TOGGLE_AI] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to toggle AI', error.message);
  }
});

// GET /v1/conversations/leads/:contactId/details
router.get('/leads/:contactId/details', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const { contactId } = req.params;
    const fullProfile = await UnifiedLeadResolver.getFullLeadDetails(contactId);
    
    // Ensure the profile belongs to the client
    if (fullProfile.contact.clientId !== clientId) {
        return envRes.sendError(403, 'FORBIDDEN', 'Access denied to this contact profile');
    }
    
    return envRes.sendSuccess(fullProfile);
  } catch (error: any) {
    console.error('[LEAD_DETAILS_FETCH] Error:', error);
    return envRes.sendError(500, 'API_ERROR', 'Failed to fetch lead details', error.message);
  }
});

export default router;
