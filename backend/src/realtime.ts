import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './config/database';
import config from './config';

interface AuthenticatedSocket extends Socket {
  data: Socket['data'] & {
    user?: { id: string; role: string };
  };
}

let io: Server | undefined;

export const initializeRealtime = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    },
  });

  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || '';
      const accessCookie = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith('accessToken='));
      const token = accessCookie ? decodeURIComponent(accessCookie.slice('accessToken='.length)) : '';
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, config.jwtSecret) as { userId?: string };
      if (!decoded.userId) return next(new Error('Invalid authentication token'));

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, accountStatus: true },
      });
      if (!user || user.accountStatus !== 'ACTIVE') return next(new Error('Account is unavailable'));

      socket.data.user = { id: user.id, role: user.role };
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    if (!user) return socket.disconnect(true);

    socket.join(`user:${user.id}`);
    if (user.role === 'ADMIN') socket.join('admin:payments');

    socket.on('admin:subscribe:payments', () => {
      if (socket.data.user?.role === 'ADMIN') socket.join('admin:payments');
    });
  });

  return io;
};

export const emitToAdmins = (event: string, payload: { paymentId?: string; propertyId: string; status: string }) => {
  io?.to('admin:payments').emit(event, payload);
};

export const emitToUser = (userId: string, event: string, payload: { paymentId?: string; propertyId: string; status: string }) => {
  io?.to(`user:${userId}`).emit(event, payload);
};