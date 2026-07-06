import { Request, Response, NextFunction } from 'express';

// For production, use Redis. Keeping in-memory for simpler demonstration without Redis dependency
const idempotencyStore = new Map<string, any>();

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (idempotencyKey) {
    if (idempotencyStore.has(idempotencyKey)) {
      const cachedResponse = idempotencyStore.get(idempotencyKey);
      return res.status(200).json(cachedResponse);
    }

    // Intercept send logic to cache it
    const originalSend = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache successful requests
      if (res.statusCode >= 200 && res.statusCode < 300) {
        idempotencyStore.set(idempotencyKey, body);
        // Clear after 24h
        setTimeout(() => idempotencyStore.delete(idempotencyKey), 1000 * 60 * 60 * 24);
      }
      return originalSend(body);
    };
  }

  next();
};
