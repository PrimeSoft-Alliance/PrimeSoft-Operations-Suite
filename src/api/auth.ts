import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Client, PlatformSettings } from './models';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token = req.cookies.admin_token;
    
    // Also support Bearer tokens mapping to the same secret
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Support API keys
    if (req.headers['x-api-key']) {
      // In a real system we would hash and look up the API key here
      // Here we assume it's valid for demonstration
      (req as any).clientId = req.headers['x-client-id'];
      return next();
    }

    if (!token) {
      if (req.headers['x-client-id']) {
         // Allow public endpoints with just client id header (e.g. chat widget)
         (req as any).clientId = req.headers['x-client-id'];
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

    // Global maintenance check
    const platformSettings = await PlatformSettings.findOne();
    if (platformSettings?.maintenanceMode && decoded.role !== 'superadmin') {
      const envRes = res as any;
      if (typeof envRes.sendError === 'function') {
        return envRes.sendError(503, 'MAINTENANCE', 'System is under maintenance');
      }
      res.status(503).json({ error: 'System is under maintenance' });
      return;
    }

    // Check suspension status for clients
    if (decoded.role === 'client' || decoded.clientId) {
      const client = await Client.findOne({ clientId: decoded.clientId });
      if (client?.status === 'suspended') {
        const envRes = res as any;
        if (typeof envRes.sendError === 'function') {
          return envRes.sendError(403, 'SUSPENDED', 'Account suspended');
        }
        res.status(403).json({ error: 'Account suspended' });
        return;
      }
    }

    next();
  } catch (error) {
    const envRes = res as any;
    if (typeof envRes.sendError === 'function') {
      return envRes.sendError(401, 'INVALID_TOKEN', 'Session expired or invalid token');
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies.admin_token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'superadmin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
