import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Client, PlatformSettings } from './models';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.admin_token;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const decoded: any = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;

    // Global maintenance check
    const platformSettings = await PlatformSettings.findOne();
    if (platformSettings?.maintenanceMode && decoded.role !== 'superadmin') {
      res.status(503).json({ error: 'System is under maintenance' });
      return;
    }

    // Check suspension status for clients
    if (decoded.role === 'client') {
      const client = await Client.findOne({ clientId: decoded.clientId });
      if (client?.status === 'suspended') {
        res.status(403).json({ error: 'Account suspended' });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const superAdminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = req.cookies.admin_token;
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
