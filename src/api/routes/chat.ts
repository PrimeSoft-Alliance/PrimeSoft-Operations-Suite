import express from 'express';
import { EnvelopeResponse } from '../middlewares/envelope';
import { resolveClientId } from '../utils/resolveClient';
import { processChatRequest } from '../services/chatService';

const router = express.Router();

router.post('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { message, sessionId, userName, userEmail: chatUserEmail, media } = req.body;
    const clientId = await resolveClientId(req);
    
    if (!clientId) {
      return res.status(401).json({ error: 'ClientId missing' });
    }

    const result = await processChatRequest({
      clientId,
      sessionId,
      message: message || '',
      userName,
      userEmail: chatUserEmail,
      platform: 'widget',
      media
    });

    const aiResponse = typeof result === 'string' ? result : result.choices[0]?.message?.content;
    const resolvedName = typeof result === 'object' ? result.userName : undefined;
    const resolvedEmail = typeof result === 'object' ? result.userEmail : undefined;

    envRes.sendSuccess({ 
      text: aiResponse,
      userName: resolvedName,
      userEmail: resolvedEmail
    });

  } catch (error: any) {
    console.error("Chat route error:", error);
    res.status(500).json({ error: 'Failed to chat', message: error?.message || 'I encountered an error. Please try again.' });
  }
});

export default router;
