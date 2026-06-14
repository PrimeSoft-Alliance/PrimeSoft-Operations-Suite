import { Server } from 'socket.io';
import express from 'express';

export const getIO = (app: express.Application): Server => {
  return app.get('io');
};

export const emitToClient = (req: express.Request, event: string, data: any) => {
  const io = req.app.get('io') as Server;
  const clientId = (req as any).clientId;
  if (io && clientId) {
    io.to(clientId).emit(event, data);
  }
};
