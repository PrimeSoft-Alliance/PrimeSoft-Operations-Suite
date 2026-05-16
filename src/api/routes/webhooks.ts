import express from 'express';
import { Webhook, WebhookDelivery } from '../models';
import crypto from 'crypto';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

router.get('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  const hooks = await Webhook.find({ clientId });
  envRes.sendSuccess(hooks);
});

router.post('/', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const clientId = (req as any).clientId;
  const { endpointUrl, events, secret } = req.body;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  if (!endpointUrl) return envRes.sendError(422, 'VALIDATION_FAILED', 'endpointUrl is required');

  try {
    const webhookId = crypto.randomUUID();
    const hook = await Webhook.create({
      webhookId,
      clientId,
      endpointUrl,
      events: events || ['*'],
      secret: secret || crypto.randomBytes(32).toString('hex')
    });

    envRes.sendSuccess(hook);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

router.get('/:webhookId/deliveries', async (req, res) => {
  const envRes = res as EnvelopeResponse;
  const { webhookId } = req.params;
  const clientId = (req as any).clientId;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');

  try {
    const deliveries = await WebhookDelivery.find({ webhookId, clientId }).sort({ createdAt: -1 }).limit(100);
    envRes.sendSuccess(deliveries);
  } catch (err: any) {
    envRes.sendError(500, 'SERVER_ERROR', err.message);
  }
});

export default router;
