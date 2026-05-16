import express from 'express';
import { Lead } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';

const router = express.Router();

router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const leads = await Lead.find({ clientId }).sort({ createdAt: -1 });
    envRes.sendSuccess(leads);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch leads');
  }
});

router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, clientId },
      { $set: req.body },
      { new: true }
    );
    if (!lead) return envRes.sendError(404, 'NOT_FOUND', 'Lead not found');
    envRes.sendSuccess(lead);
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to update lead');
  }
});

router.delete('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  try {
    await Lead.findOneAndDelete({ _id: req.params.id, clientId });
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to delete lead');
  }
});

export default router;
