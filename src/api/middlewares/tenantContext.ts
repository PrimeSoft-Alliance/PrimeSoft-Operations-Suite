import { Request, Response, NextFunction } from 'express';
import { Client } from '../models';
import { resolveClientId } from '../utils/resolveClient';

/**
 * Tenant Context Middleware
 * 
 * This middleware MUST run on all /v1 API routes that require tenant isolation.
 * It enforces that every request has a valid, database-verified clientId.
 * 
 * Responsibilities:
 * 1. Resolve the clientId from the request (header, query, body, domain, API key)
 * 2. Validate the clientId exists in the database
 * 3. Attach the clientId to the request object
 * 4. Block requests with invalid/missing clientId
 */

export const tenantContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to resolve the clientId using all available methods
    const clientId = await resolveClientId(req);

    if (!clientId) {
      console.warn('[TENANT] No clientId resolved for request:', {
        method: req.method,
        path: req.path,
        host: req.hostname,
        headers: {
          'x-client-id': req.headers['x-client-id'],
          'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined
        },
        query: req.query
      });

      const envRes = res as any;
      if (typeof envRes.sendError === 'function') {
        return envRes.sendError(
          401,
          'MISSING_TENANT_CONTEXT',
          'Client context could not be resolved. Please provide x-client-id header, API key, or access via custom domain.'
        );
      }
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Client context could not be resolved'
        }
      });
      return;
    }

    // Validate the client exists in database
    try {
      const client = await Client.findOne({ clientId });
      
      if (!client) {
        console.warn('[TENANT] ClientId not found in database:', clientId);
        
        const envRes = res as any;
        if (typeof envRes.sendError === 'function') {
          return envRes.sendError(
            404,
            'CLIENT_NOT_FOUND',
            'The client context is invalid or has been removed.'
          );
        }
        res.status(404).json({
          success: false,
          error: {
            code: 'CLIENT_NOT_FOUND',
            message: 'Client not found'
          }
        });
        return;
      }

      // Check if client is suspended
      if (client.status === 'suspended') {
        console.warn('[TENANT] Suspended client attempted access:', clientId);
        
        const envRes = res as any;
        if (typeof envRes.sendError === 'function') {
          return envRes.sendError(
            403,
            'CLIENT_SUSPENDED',
            'This client account has been suspended.'
          );
        }
        res.status(403).json({
          success: false,
          error: {
            code: 'CLIENT_SUSPENDED',
            message: 'Client account suspended'
          }
        });
        return;
      }

      // Attach to request for downstream use
      (req as any).clientId = clientId;
      (req as any).client = client;

      console.log('[TENANT] ✓ Tenant context validated:', {
        clientId,
        business: client.businessName,
        method: req.method,
        path: req.path
      });

      next();
    } catch (dbError) {
      console.error('[TENANT] Database validation error:', dbError);
      
      const envRes = res as any;
      if (typeof envRes.sendError === 'function') {
        return envRes.sendError(
          500,
          'TENANT_VALIDATION_ERROR',
          'Failed to validate client context',
          { error: String(dbError) },
          true // retryable
        );
      }
      res.status(500).json({
        success: false,
        error: {
          code: 'TENANT_VALIDATION_ERROR',
          message: 'Failed to validate client context'
        }
      });
    }
  } catch (err) {
    console.error('[TENANT] Unexpected middleware error:', err);
    
    const envRes = res as any;
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(
        500,
        'INTERNAL_ERROR',
        'An unexpected error occurred',
        { error: String(err) },
        true // retryable
      );
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};
