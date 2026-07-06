import express from 'express';
import { verificationService } from '../services/verificationService';
import { VerificationSession, VerificationAuditLog } from '../models';
import { EnvelopeResponse } from '../middlewares/envelope';
import { authMiddleware } from '../auth';

const router = express.Router();

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

// 1. Get verification policy (Required Admin Auth)
router.get('/policy', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(400, 'BAD_REQUEST', 'ClientId missing');

  try {
    const policy = await verificationService.getPolicy(clientId);
    envRes.sendSuccess(policy);
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', error.message || 'Failed to fetch verification policy');
  }
});

// 2. Put verification policy (Required Admin Auth)
router.put('/policy', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(400, 'BAD_REQUEST', 'ClientId missing');

  try {
    const updated = await verificationService.savePolicy(clientId, req.body);
    
    // Log configuration audit event
    await VerificationAuditLog.create({
      clientId,
      sessionId: 'admin',
      platform: 'dashboard',
      action: 'UPDATE_POLICY',
      level: updated.verificationLevel,
      details: `Administrator updated safety policy controls. Required fields: ${updated.requiredFields?.join(', ')}`
    });

    envRes.sendSuccess(updated);
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', error.message || 'Failed to update verification policy');
  }
});

// 2bb. Get Verification Policy Publicly (No admin auth required, only client-id scoped)
router.get('/public-policy', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(400, 'BAD_REQUEST', 'ClientId missing');

  try {
    const policy = await verificationService.getPolicy(clientId);
    // Sanitize policy to avoid exposing tenant secrets
    envRes.sendSuccess({
      verificationEnabled: policy.verificationEnabled,
      verificationLevel: policy.verificationLevel,
      requiredFields: policy.requiredFields || ['name', 'email'],
      fieldLabels: (policy as any).fieldLabels || {}
    });
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', error.message || 'Failed to fetch public verification policy');
  }
});

// 3. Public Verification Submission (no auth, client-id scoped)
router.post('/submit', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const { sessionId, inputs, platform } = req.body;
  const clientId = getCid(req);

  if (!clientId) return envRes.sendError(400, 'BAD_REQUEST', 'ClientId missing');
  if (!sessionId) return envRes.sendError(400, 'BAD_REQUEST', 'SessionId missing');
  if (!inputs || typeof inputs !== 'object') return envRes.sendError(400, 'BAD_REQUEST', 'Inputs object is required');

  try {
    const result = await verificationService.submitVerification(clientId, sessionId, inputs, platform || 'widget');
    if (result.success) {
      envRes.sendSuccess({ verified: true, session: result.session });
    } else {
      envRes.sendError(400, 'VERIFICATION_FAILED', result.error || 'Identity verification failed');
    }
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', error.message || 'Verification submission error');
  }
});

// 4. Get active verification session states (Required Admin Auth)
router.get('/sessions', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(400, 'BAD_REQUEST', 'ClientId missing');

  try {
    const sessions = await VerificationSession.find({ clientId }).sort({ updatedAt: -1 }).limit(100);
    envRes.sendSuccess(sessions);
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', error.message || 'Failed to fetch verification states');
  }
});

// 5. Get compliance security audit logs (Required Admin Auth)
router.get('/audit-logs', authMiddleware, async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = getCid(req);
  if (!clientId) return envRes.sendError(400, 'BAD_REQUEST', 'ClientId missing');

  try {
    const logs = await VerificationAuditLog.find({ clientId }).sort({ createdAt: -1 }).limit(100);
    envRes.sendSuccess(logs);
  } catch (error: any) {
    envRes.sendError(500, 'API_ERROR', error.message || 'Failed to fetch security audit trail');
  }
});

export default router;
