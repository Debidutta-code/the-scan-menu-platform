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

  public init(httpServer: HTTPServer, _corsOrigin?: string | string[]): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: (requestOrigin, callback) => {
          // Allow all incoming connections for mobile apps, local development, and web clients
          callback(null, requestOrigin || true);
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      // Public Join Order Room (Verifies caller authorization for target order)
      socket.on('join_order', async (data) => {
        const { orderId, tableToken, guestToken } = data || {};
        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
          socket.emit('error', { code: 'INVALID_ORDER_ID', message: 'Invalid or missing orderId' });
          return;
        }

        try {
          const { Order } = await import('../models/Order');
          const order = await Order.findById(orderId);
          if (!order) {
            socket.emit('error', { code: 'ORDER_NOT_FOUND', message: 'The specified order does not exist' });
            return;
          }

          let isAuthorized = false;
          const authHeader = data?.token || socket.handshake.auth.token || socket.handshake.headers.authorization;

          if (authHeader) {
            const tokenStr = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
            try {
              const staffPayload = tokenService.verifyAccessToken(tokenStr);
              if (staffPayload && (staffPayload.role === 'SUPER_ADMIN' || staffPayload.id)) {
                if (staffPayload.role === 'SUPER_ADMIN') {
                  isAuthorized = true;
                } else {
                  const { RestaurantStaff } = await import('../models/RestaurantStaff');
                  const staff = await RestaurantStaff.findOne({
                    userId: new mongoose.Types.ObjectId(staffPayload.id),
                    restaurantId: order.restaurantId,
                    isActive: true,
                  });
                  if (staff) isAuthorized = true;
                }
              }
            } catch {
              try {
                const customerPayload = tokenService.verifyCustomerToken(tokenStr);
                if (
                  customerPayload &&
                  customerPayload.role === 'CUSTOMER' &&
                  customerPayload.restaurantId === order.restaurantId.toString()
                ) {
                  if (!order.customerId || order.customerId.toString() === customerPayload.id) {
                    isAuthorized = true;
                  }
                }
              } catch {
                // Token invalid
              }
            }
          }

          const effectiveTableToken = tableToken || data?.tableToken || socket.handshake.auth.tableToken;
          if (!isAuthorized && effectiveTableToken) {
            const { Table } = await import('../models/Table');
            const table = await Table.findOne({ token: effectiveTableToken, restaurantId: order.restaurantId });
            if (table && order.tableId && table._id.toString() === order.tableId.toString()) {
              isAuthorized = true;
            }
          }

          const effectiveGuestToken = guestToken || data?.guestToken || socket.handshake.auth.guestToken;
          if (!isAuthorized && effectiveGuestToken && order.guestSessionId) {
            if (order.guestSessionId === effectiveGuestToken) {
              isAuthorized = true;
            }
          }

          if (!isAuthorized) {
            socket.emit('error', { code: 'FORBIDDEN', message: 'Unauthorized attempt to subscribe to order room' });
            return;
          }

          socket.join(`order:${orderId}`);
          logger.info(`Socket ${socket.id} joined order:${orderId}`);
          socket.emit('joined_order', { orderId });
        } catch (err) {
          socket.emit('error', { code: 'INTERNAL_SERVER_ERROR', message: 'An unhandled socket error occurred' });
        }
      });

      // Public Join Session Room (Verifies caller authorization for target DiningSession)
      socket.on('join_session', async (data) => {
        const { sessionId, tableToken, guestToken } = data || {};
        if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
          socket.emit('error', { code: 'INVALID_SESSION_ID', message: 'Invalid or missing sessionId' });
          return;
        }

        try {
          const { DiningSession } = await import('../models/DiningSession');
          const session = await DiningSession.findById(sessionId);
          if (!session) {
            socket.emit('error', { code: 'SESSION_NOT_FOUND', message: 'The specified table session does not exist' });
            return;
          }

          let isAuthorized = false;
          const authHeader = data?.token || socket.handshake.auth.token || socket.handshake.headers.authorization;

          if (authHeader) {
            const tokenStr = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
            try {
              const staffPayload = tokenService.verifyAccessToken(tokenStr);
              if (staffPayload && (staffPayload.role === 'SUPER_ADMIN' || staffPayload.id)) {
                if (staffPayload.role === 'SUPER_ADMIN') {
                  isAuthorized = true;
                } else {
                  const { RestaurantStaff } = await import('../models/RestaurantStaff');
                  const staff = await RestaurantStaff.findOne({
                    userId: new mongoose.Types.ObjectId(staffPayload.id),
                    restaurantId: session.restaurantId,
                    isActive: true,
                  });
                  if (staff) isAuthorized = true;
                }
              }
            } catch {
              try {
                const customerPayload = tokenService.verifyCustomerToken(tokenStr);
                if (
                  customerPayload &&
                  customerPayload.role === 'CUSTOMER' &&
                  customerPayload.restaurantId === session.restaurantId.toString()
                ) {
                  isAuthorized = true;
                }
              } catch {
                // Token invalid
              }
            }
          }

          const effectiveTableToken = tableToken || data?.tableToken || socket.handshake.auth.tableToken;
          if (!isAuthorized && effectiveTableToken) {
            const { Table } = await import('../models/Table');
            const table = await Table.findOne({ token: effectiveTableToken, restaurantId: session.restaurantId });
            if (table && table._id.toString() === session.tableId.toString()) {
              isAuthorized = true;
            }
          }

          const effectiveGuestToken = guestToken || data?.guestToken || socket.handshake.auth.guestToken;
          if (!isAuthorized && effectiveGuestToken) {
            const { GuestSession } = await import('../models/GuestSession');
            const foundGuest = await GuestSession.findOne({
              diningSessionId: session._id,
              guestToken: effectiveGuestToken,
            });
            if (foundGuest) isAuthorized = true;
          }

          if (!isAuthorized) {
            socket.emit('error', { code: 'FORBIDDEN', message: 'Unauthorized attempt to subscribe to session room' });
            return;
          }

          socket.join(`session:${sessionId}`);
          logger.info(`Socket ${socket.id} joined session:${sessionId}`);
          socket.emit('joined_session', { sessionId });
        } catch (err) {
          socket.emit('error', { code: 'INTERNAL_SERVER_ERROR', message: 'An unhandled socket error occurred' });
        }
      });

      // Public Join Table Room (Guests subscribe to table waiter call events)
      socket.on('join_table', async (data) => {
        const { tableToken } = data || {};
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

      // Authenticated Staff/Manager Join Restaurant Room
      socket.on('join_restaurant', async (data) => {
        const { restaurantId } = data || {};
        if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
          socket.emit('error', { code: 'INVALID_RESTAURANT_ID', message: 'Invalid or missing restaurantId' });
          return;
        }

        const authHeader =
          data?.token ||
          data?.authToken ||
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization;
        if (!authHeader) {
          socket.emit('error', { code: 'UNAUTHORIZED', message: 'Access token is missing' });
          return;
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        try {
          const payload = tokenService.verifyAccessToken(token);

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
