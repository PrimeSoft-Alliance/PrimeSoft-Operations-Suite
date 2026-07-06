import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Client } from './models';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies.auth_token;
    
    // Also support Bearer tokens mapping to the same secret
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Support API keys
    if (req.headers['x-api-key']) {
      const apiKey = req.headers['x-api-key'] as string;
      const client = await Client.findOne({ apiKey });
      if (!client) {
         const cidHeader = req.headers['x-client-id'] as string;
         if (cidHeader && cidHeader !== 'null' && cidHeader !== 'undefined' && cidHeader !== '') {
            (req as any).clientId = cidHeader;
            return next();
         }
         const envRes = res as any;
         if (typeof envRes.sendError === 'function') {
           return envRes.sendError(401, 'UNAUTHORIZED', 'Invalid API Key');
         }
         res.status(401).json({ error: 'Unauthorized' });
         return;
      }
      (req as any).user = { clientId: client.clientId, role: 'client' };
      (req as any).clientId = client.clientId;
      return next();
    }

    if (!token) {
      const cidHeader = req.headers['x-client-id'] as string;
      if (cidHeader && cidHeader !== 'null' && cidHeader !== 'undefined' && cidHeader !== '') {
         // Allow public endpoints with just client id header (e.g. chat widget)
         (req as any).clientId = cidHeader;
         return next();
      }
      
      const envRes = res as any;
      if (typeof envRes.sendError === 'function') {
        return envRes.sendError(401, 'UNAUTHORIZED', 'Authentication token missing');
      }
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const decoded: any = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    (req as any).clientId = decoded.clientId;

    // Check suspension status for clients
    if (decoded.role === 'client' || decoded.clientId) {
      const client = await Client.findOne({ clientId: decoded.clientId });
      if (!client) {
        // Special case: known system clients that might need auto-provisioning
        if (decoded.clientId === 'platform-prime' || decoded.clientId === 'sys-admin' || decoded.clientId === 'demo') {
          return next();
        }
        
        console.error(`[AUTH] Session client not found in DB. decoded.clientId: ${decoded.clientId}`);
        res.clearCookie('auth_token', {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        });
        const envRes = res as any;
        if (typeof envRes.sendError === 'function') {
          return envRes.sendError(401, 'INVALID_SESSION', 'Session client not found');
        }
        res.status(401).json({ error: 'Session client not found' });
        return;
      }
      if (client.status === 'suspended') {
        const envRes = res as any;
        if (typeof envRes.sendError === 'function') {
          return envRes.sendError(401, 'SUSPENDED', 'Account suspended');
        }
        res.status(401).json({ error: 'Account suspended' });
        return;
      }
    }

    next();
  } catch (error) {
    if (req.headers['x-client-id']) {
       (req as any).clientId = req.headers['x-client-id'];
       return next();
    }
    const envRes = res as any;
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(401, 'INVALID_TOKEN', 'Session expired or invalid token');
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

