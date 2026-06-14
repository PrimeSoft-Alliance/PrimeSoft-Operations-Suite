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
    
    let client = await Client.findOne({ clientId });
    if (!client && (clientId === 'platform-prime' || clientId === 'sys-admin' || clientId === 'demo')) {
      const { Settings } = await import('../models');
      client = await Client.create({
        clientId,
        businessName: clientId === 'platform-prime' ? 'Platform Central' : clientId === 'sys-admin' ? 'System Admin' : 'Demo Business',
        email: clientId === 'platform-prime' ? 'central@platform.com' : clientId === 'sys-admin' ? 'admin@platform.com' : 'demo@platform.com',
        password: 'platform_placeholder_pwd',
        role: clientId === 'sys-admin' ? 'admin' : 'client',
        status: 'active'
      });
      await Settings.create({
        clientId,
        businessName: client.businessName,
        email: client.email,
        aboutText: 'Auto-provisioned default hub.'
      }).catch(() => {});
      console.log(`[TENANT] Auto-provisioned missing standard client and settings for: ${clientId}`);
    }
    
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
