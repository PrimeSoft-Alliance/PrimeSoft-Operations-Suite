import express from 'express';
import { telnyxService } from '../services/telnyxService';
import { Client } from '../models';
import pino from 'pino';

const logger = pino({ name: 'TelnyxWebhookRoute' });
const router = express.Router();

/**
 * Public Telnyx Webhook Endpoint
 * Path: /v1/telnyx-webhooks/:clientId
 */
router.post('/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const payload = req.body;

  try {
    // 1. Verify Client
    const client = await Client.findOne({ clientId });
    if (!client) {
      logger.warn({ clientId }, 'Webhook received for unknown client');
      return res.status(404).json({ error: 'Client not found' });
    }

    // 2. Delegate to Service
    // Note: We don't wait for processing to avoid blocking Telnyx (though the service handles it mostly async)
    telnyxService.handleWebhook(clientId, payload).catch(err => {
      logger.error({ err, clientId }, 'Error in telnyxService.handleWebhook');
    });

    // 3. Respond Success Immediately
    res.status(200).json({ status: 'received' });
  } catch (err: any) {
    logger.error({ err, clientId }, 'Critical error in Telnyx webhook route');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
