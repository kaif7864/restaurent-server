import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`⚡ [Socket.io] Client connected: ${socket.id}`);

    socket.on('join-restaurant', (restaurantId) => {
      socket.join(`restaurant:${restaurantId}`);
      console.log(`⚡ [Socket.io] Client ${socket.id} joined room restaurant:${restaurantId}`);
    });

    socket.on('disconnect', () => {
      console.log(`⚡ [Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const notifyOrderUpdate = (data: any) => {
  if (io) {
    io.emit('order:created', data);
    io.emit('order:updated', data);
    io.emit('order-updated', data);
  }
};

export const notifyWaiterCall = (data: any) => {
  if (io) {
    io.emit('waiter:called', data);
    io.emit('waiter-called', data);
  }
};
