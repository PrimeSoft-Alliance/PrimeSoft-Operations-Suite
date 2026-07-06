import express from 'express';
import { TelegramSession, Conversation } from '../models';
import { telegramManager } from '../services/telegramManager';
import { authMiddleware } from '../auth';
import { tenantContextMiddleware } from '../middlewares/tenantContext';

const router = express.Router();

// POST /api/telegram/verify-token
router.post('/verify-token', authMiddleware, async (req, res) => {
  try {
    const { botToken } = req.body;
    if (!botToken) return res.status(400).json({ error: 'botToken is required' });
    
    const verification = await telegramManager.validateBotToken(botToken);
    res.json(verification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/connect
router.post('/connect', authMiddleware, async (req, res) => {
  try {
    const { tenantId, botToken } = req.body;
    if (!tenantId || !botToken) return res.status(400).json({ error: 'tenantId and botToken are required' });

    // Verify first
    const verification = await telegramManager.validateBotToken(botToken);
    if (!verification.success) return res.status(400).json({ error: 'Invalid bot token' });

    // Save or update session
    await TelegramSession.findOneAndUpdate(
      { tenantId },
      { 
        clientId: tenantId,
        tenantId,
        botToken, 
        botUsername: verification.botUsername, 
        botId: verification.botId,
        displayName: verification.displayName,
        status: 'disconnected' 
      },
      { upsert: true }
    );

    await telegramManager.connectTenant(tenantId);
    res.json({ success: true, message: 'Bot connected successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/disconnect
router.post('/disconnect', authMiddleware, async (req, res) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    await telegramManager.disconnectTenant(tenantId);
    res.json({ success: true, message: 'Bot disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/restart
router.post('/restart', authMiddleware, async (req, res) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    await telegramManager.restartTenant(tenantId);
    res.json({ success: true, message: 'Bot restarting...' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telegram/status/:tenantId
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const status = await telegramManager.getSessionStatus(tenantId);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/send
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { tenantId, chatId, payload } = req.body;
    if (!tenantId || !chatId || !payload) {
      return res.status(400).json({ error: 'tenantId, chatId, and payload are required' });
    }
    await telegramManager.sendMessage(tenantId, chatId, payload);
    
    // Log outbound message to conversation
    let text = payload.text || '[Media]';
    let conv = await Conversation.findOne({ clientId: tenantId, customerJid: chatId });
    if (!conv) conv = new Conversation({ clientId: tenantId, customerJid: chatId, messages: [] });
    conv.messages.push({ sender: 'assistant', text, timestamp: new Date() });
    await conv.save();

    res.json({ success: true, message: 'Message sent' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/telegram/pause
router.post('/pause', authMiddleware, async (req, res) => {
  try {
    const { tenantId, paused } = req.body;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    await telegramManager.togglePause(tenantId, paused);
    res.json({ success: true, message: `AI response ${paused ? 'paused' : 'resumed'}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/telegram/health
router.get('/health', async (req, res) => {
  try {
    const health = await telegramManager.getHealth();
    res.json({ success: true, ...health });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook endpoint (if using webhooks instead of polling)
router.post('/webhook/:tenantId', async (req, res) => {
  // Webhook logic would go here if not using polling
  // For the sake of this implementation, we handle messages via polling event listeners
  // but we acknowledge the webhook endpoint as requested.
  res.status(200).send('OK');
});

// Backward compatibility or secondary routes for Dashboard
router.get('/conversations/:clientId', authMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const conversations = await Conversation.find({ clientId }).sort({ updatedAt: -1 });
    res.json({ success: true, data: conversations });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
