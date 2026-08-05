import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response';

export class HealthController {
  constructor() {
    this.getLiveness = this.getLiveness.bind(this);
    this.getReadiness = this.getReadiness.bind(this);
  }

  /**
   * GET /health/liveness
   * Fast process liveness check (200 OK if process is running).
   */
  async getLiveness(req: Request, res: Response): Promise<void> {
    sendSuccess(res, { status: 'UP', timestamp: new Date().toISOString() }, 'Process is live');
  }

  /**
   * GET /health/readiness
   * Deep readiness check inspecting database connection state and system health metrics.
   */
  async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dbState = mongoose.connection.readyState;
      const isDbConnected = dbState === 1;

      const memoryUsage = process.memoryUsage();
      const uptimeSeconds = Math.floor(process.uptime());

      const payload = {
        status: isDbConnected ? 'READY' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        uptimeSeconds,
        database: {
          connected: isDbConnected,
          readyState: dbState, // 1 = connected, 2 = connecting, 0 = disconnected
        },
        memory: {
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        },
      };

      const statusCode = isDbConnected ? 200 : 503;
      sendSuccess(res, payload, isDbConnected ? 'System is ready' : 'System is degraded (DB disconnected)', statusCode);
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();
export default healthController;
