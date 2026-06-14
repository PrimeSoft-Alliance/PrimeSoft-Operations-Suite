import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (clientId: string) => {
  if (!socket) {
    socket = io(window.location.origin);
    
    socket.on('connect', () => {
      console.log('Socket connected');
      socket?.emit('join', clientId);
    });

    socket.on('reconnect', () => {
      socket?.emit('join', clientId);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
