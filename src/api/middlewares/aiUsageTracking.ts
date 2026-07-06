import { Request, Response, NextFunction } from 'express';
import { checkAIQuota, recordAIUsage } from '../services/quotaService';
import { EnvelopeResponse } from '../middlewares/envelope';

export const aiUsageTracking = async (req: Request, res: Response, next: NextFunction) => {
  const envRes = res as any as EnvelopeResponse;
  const clientId = (req as any).clientId;
  
  if (!clientId) {
    return next();
  }

  // Pre-check quota
  const estimatedTokens = 1; // Basic assumption for request allowance
  const quotaCheck = await checkAIQuota(clientId, estimatedTokens, 'api');
  
  if (!quotaCheck.allowed) {
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(402, 'QUOTA_EXCEEDED', quotaCheck.reason);
    }
    return res.status(402).json({ error: quotaCheck.reason });
  }

  // Inject a method to track usage after successful response
  (req as any).recordTokens = async (tokens: number, feature: string) => {
    try {
      await recordAIUsage(clientId, feature, 'api', 'web', tokens, { path: req.path });
    } catch (e) {
      console.error('[USAGE_TRACKING_ERR]', e);
    }
  };

  next();
};
