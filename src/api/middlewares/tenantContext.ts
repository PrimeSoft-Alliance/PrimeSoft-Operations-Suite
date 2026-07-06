import { Request, Response, NextFunction } from 'express';
import { resolveClientId } from '../utils/resolveClient';
import { Client } from '../models';
import { EnvelopeResponse } from './envelope';
import bcrypt from 'bcryptjs';

export const tenantContextMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const envRes = res as any as EnvelopeResponse;
  
  try {
    const clientId = (req as any).clientId || await resolveClientId(req);
    
    if (!clientId) {
      if (typeof envRes.sendError === 'function') {
        return envRes.sendError(401, 'UNAUTHORIZED', 'Unable to identify tenant. Provide clientId via header (x-client-id), query, or body.');
      }
      return res.status(401).json({ error: 'Unable to identify tenant' });
    }
    
    let client = await Client.findOne({ clientId });
    console.log(`[TENANT] Finding client with clientId: ${clientId}. Found: ${!!client}`);
    if (!client && (clientId === 'platform-prime' || clientId === 'sys-admin' || clientId === 'demo')) {
      const { Settings } = await import('../models');
      const hashedPassword = await bcrypt.hash('platform_prime_2026', 10);
      
      try {
        client = await Client.findOneAndUpdate(
          { clientId },
          {
            $setOnInsert: {
              clientId,
              businessName: clientId === 'platform-prime' ? 'Platform Central' : clientId === 'sys-admin' ? 'System Admin' : 'Demo Business',
              email: clientId === 'platform-prime' ? 'central@platform.com' : clientId === 'sys-admin' ? 'admin@platform.com' : 'demo@platform.com',
              password: hashedPassword,
              role: (clientId === 'sys-admin' || clientId === 'platform-prime') ? 'admin' : 'client',
              status: 'active',
              isActivated: true
            }
          },
          { upsert: true, new: true, runValidators: false }
        );
        
        await Settings.findOneAndUpdate(
          { clientId },
          {
            $setOnInsert: {
              clientId,
              businessName: client?.businessName,
              email: client?.email,
              aboutText: 'Auto-provisioned default hub.'
            }
          },
          { upsert: true }
        );
        console.log(`[TENANT] Auto-provisioned missing standard client: ${clientId}`);
      } catch (upsertErr: any) {
        // Silent recovery for concurrent upserts
        client = await Client.findOne({ clientId });
        if (!client) throw upsertErr;
      }
    }
    
    if (!client) {
      if (typeof envRes.sendError === 'function') {
        return envRes.sendError(401, 'UNAUTHORIZED', 'Client not found. Invalid or inactive tenant.');
      }
      return res.status(401).json({ error: 'Client not found' });
    }
    
    (req as any).clientId = clientId;
    (req as any).client = client;
    
    next();
  } catch (err) {
    console.error('[TENANT] Error in tenant context middleware:', err);
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(500, 'SERVER_ERROR', 'Tenant context validation failed');
    }
    res.status(500).json({ error: 'Tenant context validation failed' });
  }
};
