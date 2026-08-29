import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import config, { validateStartupConfig } from './config';

// Validate critical startup configurations
validateStartupConfig();

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import menuRoutes from './routes/menu.routes';
import restaurantRoutes from './routes/restaurant.routes';
import orderRoutes from './routes/order.routes';
import waiterCallRoutes from './routes/waiterCall.routes';
import publicRoutes from './routes/public.routes';
import customerRoutes from './routes/customer.routes';
import paymentRoutes from './routes/payment.routes';
import webhookRoutes from './routes/webhook.routes';
import analyticsRoutes from './routes/analytics.routes';
import inventoryRoutes from './routes/inventory.routes';
import openapiRoutes from './routes/openapi.routes';
import developerRoutes from './routes/developer.routes';
import healthRoutes from './routes/health.routes';
import notificationRoutes from './routes/notification.routes';
import shiftRoutes from './routes/shift.routes';
import { globalSubscriptionRoutes, restaurantSubscriptionRoutes } from './routes/subscription.routes';
import { correlationIdMiddleware } from './middleware/correlationId.middleware';
import { authRateLimiter, generalApiRateLimiter } from './middleware/rateLimiter.middleware';
import { setupGracefulShutdown } from './utils/gracefulShutdown';
import { errorHandler } from './middleware/errorHandler';
import { SocketService } from './sockets/socket.service';
import { logger } from './utils/logger';
import { Order } from './models/Order';
import { runMigration } from './utils/migrateSessions';
import { posIntegrationService } from './services/posIntegration.service';

const app = express();
const httpServer = createServer(app);

// Trust Proxy (required for accurate rate-limiting behind load balancers)
app.set('trust proxy', 1);

// Security configuration
app.use(helmet());

const allowedBaseDomain = config.app.baseDomain;
const corsOriginRegex = new RegExp(
  `^https?:\\/\\/([a-z0-9-]+\\.)?${allowedBaseDomain.replace('.', '\\.')}(:[0-9]+)?$`,
  'i'
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        config.app.isTest ||
        corsOriginRegex.test(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === config.app.clientUrl ||
        origin === config.app.socketCorsOrigin
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);

app.use(correlationIdMiddleware);
app.use('/health', healthRoutes);

// Rate limiting
app.use(generalApiRateLimiter);

app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routing
app.use('/api/v1/auth/login', authRateLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Subscription plan listing (any authenticated user) and per-tenant assignment (SUPER_ADMIN only)
app.use('/api/v1/subscription', globalSubscriptionRoutes);

// Mount orderRoutes first so STAFF role can access orders without being blocked by menuRoutes/restaurantRoutes top-level MANAGER checks.
// Mount menuRoutes BEFORE restaurantRoutes to prevent wildcard param collision clashing (:restaurantId matches categories-reorder etc.)
app.use('/api/v1/restaurants/:restaurantId/analytics', analyticsRoutes);
app.use('/api/v1/restaurants/:restaurantId/developer', developerRoutes);
app.use('/api/v1/restaurants/:restaurantId/inventory', inventoryRoutes);
app.use('/api/v1/restaurants/:restaurantId/payments', paymentRoutes);
app.use('/api/v1/restaurants/:restaurantId/shifts', shiftRoutes);
app.use('/api/v1/restaurants', orderRoutes);
app.use('/api/v1/restaurants', waiterCallRoutes);
app.use('/api/v1/restaurants', restaurantSubscriptionRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/restaurants', menuRoutes);

app.use('/api/v1/openapi', openapiRoutes);
app.use('/api/v1/public/customers', customerRoutes);
app.use('/api/v1/public', publicRoutes);


// Health check route
app.get('/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  const mongoStateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const isHealthy = mongoState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      environment: config.app.nodeEnv,
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStateMap[mongoState] ?? 'unknown',
      },
    },
    message: isHealthy ? 'Server is healthy' : 'Server is degraded',
  });
});

// Global Error Handler
app.use(errorHandler);

// Socket.io initialization
const socketCorsOrigin = config.app.socketCorsOrigin;
SocketService.getInstance().init(httpServer, socketCorsOrigin);

// Startup logic
export const startServer = async () => {
  const PORT = config.app.port;
  const mongoURI = config.db.mongoUri;

  try {
    await mongoose.connect(mongoURI);
    logger.info('Successfully connected to MongoDB.');

    // Sync Mongoose models indexes (e.g. drop old table indexes)
    try {
      const { Table } = await import('./models/Table');
      await Table.collection.dropIndex('restaurantId_1_tableNumber_1');
    } catch (e) {
      // Ignore if index doesn't exist
    }
    const { Table } = await import('./models/Table');
    await Table.syncIndexes();

    // Startup safety check and auto-migration for unmigrated orders
    try {
      const unmigratedCount = await Order.countDocuments({
        $or: [
          { sessionId: { $exists: false } },
          { sessionId: null },
          { roundNumber: { $exists: false } },
          { roundNumber: null },
        ],
      });
      if (unmigratedCount > 0) {
        logger.warn(`[Startup Safety Check] Found ${unmigratedCount} unmigrated orders lacking sessionId/roundNumber. Executing automatic session migration...`);
        await runMigration();
        logger.info('[Startup Safety Check] Automatic session migration completed successfully.');
      }
    } catch (checkErr) {
      logger.error(checkErr, 'Error running startup safety check / auto-migration for unmigrated orders');
    }

    setupGracefulShutdown(httpServer);

    // Start background POS retry worker (every 30 seconds)
    posIntegrationService.startRetryWorker(30000);
    logger.info('[POS] Automatic background retry worker started.');

    httpServer.listen(PORT, () => {
      logger.info(`Server is running in ${config.app.nodeEnv} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(error, 'Error starting the server');
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app, httpServer };
