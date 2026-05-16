import express from 'express';
import { ContentItem } from '../models';
import crypto from 'crypto';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

router.get('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { type } = req.query;
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  const query: any = { clientId, status: { $ne: 'archived' } };
  if (type) query.type = type;
  
  const content = await ContentItem.find(query);
  envRes.sendSuccess(content);
});

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { type, title, slug, body, mediaReferences, url, tags } = req.body;
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (!type || !title || !slug) {
    return envRes.sendError(422, 'VALIDATION_FAILED', 'type, title, slug are required');
  }

  try {
    const contentId = crypto.randomUUID();
    const content = await ContentItem.create({
      contentId,
      clientId,
      type,
      title,
      slug,
      body,
      mediaReferences,
      url,
      tags
    });
    envRes.sendSuccess(content);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.patch('/:contentId', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const { contentId } = req.params;
  const clientId = (req as any).clientId;
  const updates = req.body;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const content = await ContentItem.findOneAndUpdate(
      { contentId, clientId },
      { $set: updates, $inc: { version: 1 } },
      { new: true }
    );

    if (!content) return envRes.sendError(404, 'NOT_FOUND', 'Content not found');
    envRes.sendSuccess(content);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

export default router;
