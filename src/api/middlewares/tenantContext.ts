import { Request, Response, NextFunction } from 'express';
import { resolveClientId } from '../utils/resolveClient';
import { Client } from '../models';
import { EnvelopeResponse } from './envelope';

export const tenantContextMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const envRes = res as any as EnvelopeResponse;
  
  try {
    const clientId = (req as any).clientId || await resolveClientId(req);
    
    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Unable to identify tenant. Provide clientId via header (x-client-id), query, or body.');
    }
    
    const client = await Client.findOne({ clientId });
    if (!client) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Client not found. Invalid or inactive tenant.');
    }
    
    (req as any).clientId = clientId;
    (req as any).client = client;
    
    next();
  } catch (err) {
    console.error('[TENANT] Error in tenant context middleware:', err);
    envRes.sendError(500, 'SERVER_ERROR', 'Tenant context validation failed');
  }
};
