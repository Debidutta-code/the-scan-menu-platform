import { Server } from 'http';
import mongoose from 'mongoose';
import { logger } from './logger';

export const setupGracefulShutdown = (server: Server): void => {
  let isShuttingDown = false;

  const handleSignal = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    logger.info(`[GracefulShutdown] Received ${signal}. Initiating graceful shutdown...`);

    // 1. Stop accepting new HTTP connections
    server.close(async (err) => {
      if (err) {
        logger.error('[GracefulShutdown] Error closing HTTP server:', err);
      } else {
        logger.info('[GracefulShutdown] HTTP server closed successfully.');
      }

      // 2. Safely close database connection
      try {
        await mongoose.connection.close();
        logger.info('[GracefulShutdown] Database connection closed.');
      } catch (dbErr) {
        logger.error('[GracefulShutdown] Error closing database connection:', dbErr);
      }

      logger.info('[GracefulShutdown] Graceful shutdown completed. Exiting process.');
      process.exit(0);
    });

    // Timeout force exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      logger.error('[GracefulShutdown] Shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
};
