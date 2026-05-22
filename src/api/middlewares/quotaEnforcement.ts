import { Request, Response, NextFunction } from 'express';
import { checkAIQuota } from '../utils/aiUsageTracker';
import { EnvelopeResponse } from './envelope';

export async function quotaEnforcementMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientId = (req as any).clientId;
  if (!clientId) {
    const envRes = res as any as EnvelopeResponse;
    return envRes.sendError(401, 'UNAUTHORIZED', 'clientId missing');
  }

  const isAIRoute = req.path.includes('ai') || req.path.includes('generate') || req.path.includes('chat');
  if (isAIRoute) {
    const quota = await checkAIQuota(clientId, 1);
    if (!quota.allowed) {
      const envRes = res as any as EnvelopeResponse;
      return envRes.sendError(429, 'QUOTA_EXCEEDED', quota.message || 'AI quota exceeded');
    }
  }
  next();
}

export function tierFeatureMiddleware(requiredFeature: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = (req as any).clientId;
    if (!clientId) {
      const envRes = res as any as EnvelopeResponse;
      return envRes.sendError(401, 'UNAUTHORIZED', 'clientId missing');
    }

    try {
      const { Quota } = await import('../models');
      const quota = await Quota.findOne({ clientId });
      if (!quota) {
        const envRes = res as any as EnvelopeResponse;
        return envRes.sendError(403, 'FORBIDDEN', 'Client quota not configured');
      }

      const isFeatureEnabled = (quota.enabledFeatures as any)[requiredFeature];
      if (!isFeatureEnabled) {
        const envRes = res as any as EnvelopeResponse;
        return envRes.sendError(403, 'FEATURE_NOT_AVAILABLE', `${requiredFeature} is not available in your tier`);
      }
      next();
    } catch (err) {
      console.error('[QUOTA] Feature check error:', err);
      const envRes = res as any as EnvelopeResponse;
      return envRes.sendError(500, 'SERVER_ERROR', 'Failed to check feature availability');
    }
  };
}
