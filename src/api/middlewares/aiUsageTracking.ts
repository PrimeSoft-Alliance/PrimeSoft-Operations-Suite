import { Request, Response, NextFunction } from 'express';
import { recordAIUsage } from '../services/quotaService';

/**
 * Middleware to track AI usage on endpoints that use AI
 * Attach metadata to request object to be recorded after response
 */
export function aiUsageTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Initialize tracking object
  (req as any).aiTracking = {
    enabled: false,
    feature: '',
    source: '',
    tokensUsed: 0,
    metadata: {}
  };

  // Wrap res.json to track response
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    // Record usage if tracking is enabled
    if ((req as any).aiTracking?.enabled) {
      const clientId = (req as any).clientId;
      const tracking = (req as any).aiTracking;

      recordAIUsage(
        clientId,
        tracking.feature,
        tracking.source,
        tracking.tokensUsed || 1,
        {
          endpoint: req.originalUrl,
          method: req.method,
          ...tracking.metadata
        }
      ).catch(err => console.error('[TRACKING] Failed to record usage:', err));
    }

    return originalJson(data);
  };

  next();
}

/**
 * Helper function to enable tracking on a request
 * Call this in AI endpoints after validating quota
 */
export function enableAITracking(
  req: Request,
  feature: string,
  source: string,
  tokensUsed?: number,
  metadata?: any
) {
  (req as any).aiTracking = {
    enabled: true,
    feature,
    source,
    tokensUsed: tokensUsed || 1,
    metadata: metadata || {}
  };
}
