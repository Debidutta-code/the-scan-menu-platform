import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';
import { TokenService } from '../services/token.service';
import config from '../config';
import mongoose from 'mongoose';

const tokenService = new TokenService();

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HTTPServer, corsOrigin: string | string[]): SocketIOServer {
    // Normalize to an array for consistent matching
    const allowedOrigins = Array.isArray(corsOrigin)
      ? corsOrigin.map((o) => o.trim())
      : corsOrigin.split(',').map((o) => o.trim());

    this.io = new SocketIOServer(httpServer, {
      cors: {
        // Dynamic origin: echo back the requesting origin if it's in the allowed list.
        // A static comma-separated string causes browsers to reject the response because
        // Access-Control-Allow-Origin must contain exactly one value.
        origin: (requestOrigin, callback) => {
          if (
            !requestOrigin ||
            allowedOrigins.includes(requestOrigin) || 
            requestOrigin.includes('localhost') ||
            config.app.isTest
          ) {
            callback(null, requestOrigin || allowedOrigins[0]);
          } else {
            callback(new Error(`CORS: origin '${requestOrigin}' not allowed`));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Public Join Order Room (Hardened: verifies orderId exists in DB to prevent arbitrary room snooping)
      socket.on('join_order', async (data) => {
        const { orderId } = data;
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
          socket.emit('error', { code: 'INVALID_ORDER_ID', message: 'Invalid or missing orderId' });
          return;
        }

        try {
          if (!config.app.isTest) {
            const { Order } = await import('../models/Order');
            const orderExists = await Order.exists({ _id: new mongoose.Types.ObjectId(orderId) });
            if (!orderExists) {
              socket.emit('error', { code: 'ORDER_NOT_FOUND', message: 'The specified order does not exist' });
              return;
            }
          }

          socket.join(`order:${orderId}`);
          logger.info(`Socket ${socket.id} joined order:${orderId}`);
          socket.emit('joined_order', { orderId });
        } catch (err) {
          socket.emit('error', { code: 'INTERNAL_SERVER_ERROR', message: 'An unhandled socket error occurred' });
        }
      });

      // Public Join Session Room (Hardened: verifies sessionId exists in DB to prevent arbitrary room snooping)
      socket.on('join_session', async (data) => {
        const { sessionId } = data;
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
          socket.emit('error', { code: 'INVALID_SESSION_ID', message: 'Invalid or missing sessionId' });
          return;
        }

        try {
          if (!config.app.isTest) {
            const { TableSession } = await import('../models/TableSession');
            const sessionExists = await TableSession.exists({ _id: new mongoose.Types.ObjectId(sessionId) });
            if (!sessionExists) {
              socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'The specified table session does not exist' });
              return;
            }
          }

          socket.join(`session:${sessionId}`);
          logger.info(`Socket ${socket.id} joined session:${sessionId}`);
          socket.emit('joined_session', { sessionId });
        } catch (err) {
          socket.emit('error', { code: 'INTERNAL_SERVER_ERROR', message: 'An unhandled socket error occurred' });
        }
      });

      // Public Join Table Room (guests subscribe to their table's waiter call events)
      socket.on('join_table', async (data) => {
        const { tableToken } = data;
        if (!tableToken || typeof tableToken !== 'string') {
          socket.emit('error', { code: 'INVALID_TABLE_TOKEN', message: 'Invalid or missing tableToken' });
          return;
        }

        try {
          if (!config.app.isTest) {
            const { Table } = await import('../models/Table');
            const tableExists = await Table.exists({ token: tableToken, isActive: true });
            if (!tableExists) {
              socket.emit('error', { code: 'TABLE_NOT_FOUND', message: 'The specified table was not found' });
              return;
            }
          }

          socket.join(`table:${tableToken}`);
          logger.info(`Socket ${socket.id} joined table:${tableToken}`);
          socket.emit('joined_table', { tableToken });
        } catch (err) {
          socket.emit('error', { code: 'INTERNAL_SERVER_ERROR', message: 'An unhandled socket error occurred' });
        }
      });

      socket.on('join_restaurant', async (data) => {
        const { restaurantId } = data;
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
          socket.emit('error', { code: 'INVALID_RESTAURANT_ID', message: 'Invalid or missing restaurantId' });
          return;
        }

        // Pass token via socket.handshake.auth.token or headers
        const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!authHeader) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Access token is missing' });
          return;
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        try {
          const payload = tokenService.verifyAccessToken(token);

          // Bypass validation if user is SUPER_ADMIN
          if (payload.role !== 'SUPER_ADMIN') {
            const RestaurantStaff = (await import('../models/RestaurantStaff')).RestaurantStaff;
            const staffRecord = await RestaurantStaff.findOne({
              userId: new mongoose.Types.ObjectId(payload.id),
              restaurantId: new mongoose.Types.ObjectId(restaurantId),
              isActive: true,
            });

            if (!staffRecord) {
              socket.emit('error', {
                code: 'FORBIDDEN',
                message: 'Access denied. You do not have permissions for this restaurant.',
              });
              return;
            }
          }

          socket.join(`restaurant:${restaurantId}`);
          logger.info(`Socket ${socket.id} joined restaurant:${restaurantId}`);
          socket.emit('joined_restaurant', { restaurantId });
        } catch (err: any) {
          if (err.name === 'TokenExpiredError') {
            socket.emit('error', { code: 'TOKEN_EXPIRED', message: 'Access token has expired' });
          } else {
            socket.emit('error', { code: 'UNAUTHORIZED', message: 'Access token is invalid' });
          }
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    return this.io;
  }

  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.io has not been initialized. Call init first.');
    }
    return this.io;
  }
}
export default SocketService;
