import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface EnvelopeResponse extends Response {
  sendSuccess: (data: any, meta?: any) => void;
  sendError: (status: number, code: string, message: string, details?: any, retryable?: boolean) => void;
}

export const requestEnvelopeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || `req_${crypto.randomBytes(8).toString('hex')}`;
  (req as any).requestId = requestId;

  // Add standard success response helper
  (res as any).sendSuccess = (data: any, meta: any = {}) => {
    res.status(200).json({
      success: true,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      data,
      meta: {
        version: "v1",
        clientId: (req as any).clientId || (req as any).user?.clientId,
        ...meta
      }
    });
  };

  // Add standard error response helper
  (res as any).sendError = (status: number, code: string, message: string, details: any = {}, retryable: boolean = false) => {
    res.status(status).json({
      success: false,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message,
        details,
        retryable
      }
    });
  };

  next();
};
