import express from 'express';
import { Lead, Booking, Contact, Client } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';

const router = express.Router();

router.use(authMiddleware);

const getCid = (req: any) => {
  const userCid = req.user?.clientId;
  const reqCid = (req as any).clientId;
  const queryCid = req.query.clientId;
  const headerCid = req.headers['x-client-id'];

  let cid = 'plumber-001';

  if (req.user?.role === 'superadmin') {
    cid = queryCid || headerCid || 'plumber-001';
  } else {
    cid = userCid || reqCid || 'plumber-001';
  }

  (req as any).clientId = cid;
  return cid;
};

router.get('/', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  console.log(`[LEADS] Fetching for clientId: ${clientId}`);
  
  if (!clientId) return envRes.sendError(401, 'UNAUTHORIZED', 'clientId is missing');
  
  try {
    // 1. Fetch all leads
    console.log(`[LEADS] Querying Leads collection for ${clientId}`);
    const [leads, client] = await Promise.all([
      Lead.find({ clientId }).sort({ lastActivity: -1, createdAt: -1 }).lean(),
      Client.findOne({ clientId }).lean()
    ]);
    console.log(`[LEADS] Found ${leads.length} leads for ${clientId}`);

    envRes.sendSuccess(leads, { clientId, businessName: client?.businessName });
  } catch (error) {
    console.error('[LEADS_FETCH] Error:', error);
    envRes.sendError(500, 'API_ERROR', 'Failed to fetch leads', String(error));
  }
});

router.put('/:id', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
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
  const clientId = getCid(req);
  try {
    await Lead.findOneAndDelete({ _id: req.params.id, clientId });
    envRes.sendSuccess({ success: true });
  } catch (error) {
    envRes.sendError(500, 'API_ERROR', 'Failed to delete lead');
  }
});

export default router;
