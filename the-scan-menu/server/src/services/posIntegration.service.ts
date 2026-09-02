import { Types } from 'mongoose';
import { IIntegrationSyncLog, IntegrationSyncOperation } from '../models/IntegrationSyncLog';
import { integrationSyncLogRepository } from '../repositories/integrationSyncLog.repository';
import { restaurantSettingsRepository } from '../repositories/restaurantSettings.repository';
import { orderRepository } from '../repositories/order.repository';
import { IntegrationFactory } from '../integrations/core/IntegrationFactory';
import { logger } from '../utils/logger';

export interface SyncLogQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export class PosIntegrationService {
  private static instance: PosIntegrationService;
  private workerTimer: NodeJS.Timeout | null = null;
  public readonly MAX_RETRIES = 5;

  public static getInstance(): PosIntegrationService {
    if (!PosIntegrationService.instance) {
      PosIntegrationService.instance = new PosIntegrationService();
    }
    return PosIntegrationService.instance;
  }

  /**
   * Calculates exponential backoff in milliseconds:
   * Attempt 1: 30s
   * Attempt 2: 60s
   * Attempt 3: 120s
   * Attempt 4: 240s
   * Attempt 5: 480s (8 min cap)
   */
  public calculateBackoffMs(attempt: number): number {
    const baseMs = 30 * 1000;
    const maxMs = 8 * 60 * 1000;
    const delay = baseMs * Math.pow(2, Math.max(0, attempt - 1));
    return Math.min(delay, maxMs);
  }

  /**
   * Asynchronously push an order to the configured POS provider.
   * Non-blocking. Sets up retry schedule if initial attempt fails.
   */
  public async pushOrderAsync(restaurantId: string | Types.ObjectId, order: any): Promise<void> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;
    const oId = order?._id ? (typeof order._id === 'string' ? new Types.ObjectId(order._id) : order._id) : undefined;

    setImmediate(async () => {
      try {
        const settings = await restaurantSettingsRepository.findByRestaurantId(rId);
        const provider = settings?.paymentConfig?.integrationConfig?.provider || 'NONE';

        const syncLog = await integrationSyncLogRepository.create({
          restaurantId: rId,
          orderId: oId,
          provider,
          operation: 'PUSH_ORDER' as IntegrationSyncOperation,
          status: 'PENDING',
          syncAttempts: 1,
          maxRetries: this.MAX_RETRIES,
          lastAttemptAt: new Date(),
          payloadSnapshot: {
            orderNumber: order?.orderNumber,
            total: order?.total,
            itemsCount: order?.items?.length || 0,
            orderMode: order?.orderMode,
          },
        });

        try {
          const adapter = IntegrationFactory.getAdapter(provider);
          await adapter.pushOrder(order);
          syncLog.status = 'SUCCESS';
          syncLog.nextRetryAt = null;
          await integrationSyncLogRepository.save(syncLog);
        } catch (err: any) {
          const errorMsg = err?.message || 'Unknown POS push error';
          syncLog.status = 'FAILED';
          syncLog.errorMessage = errorMsg;
          syncLog.errorLog = errorMsg;
          syncLog.nextRetryAt = new Date(Date.now() + this.calculateBackoffMs(1));
          await integrationSyncLogRepository.save(syncLog);
          logger.warn(`POS pushOrder failed for restaurant ${rId}, order ${oId}: ${errorMsg}. Next retry at ${syncLog.nextRetryAt.toISOString()}`);
        }
      } catch (outerErr: any) {
        logger.error(`Critical failure in POS pushOrderAsync wrapper: ${outerErr?.message}`);
      }
    });
  }

  /**
   * Asynchronously update order status in the configured POS provider.
   */
  public async updateOrderStatusAsync(
    restaurantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    status: string
  ): Promise<void> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;
    const oId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

    setImmediate(async () => {
      try {
        const settings = await restaurantSettingsRepository.findByRestaurantId(rId);
        const provider = settings?.paymentConfig?.integrationConfig?.provider || 'NONE';

        const syncLog = await integrationSyncLogRepository.create({
          restaurantId: rId,
          orderId: oId,
          provider,
          operation: 'UPDATE_STATUS' as IntegrationSyncOperation,
          status: 'PENDING',
          syncAttempts: 1,
          maxRetries: this.MAX_RETRIES,
          lastAttemptAt: new Date(),
          payloadSnapshot: { status },
        });

        try {
          const adapter = IntegrationFactory.getAdapter(provider);
          await adapter.updateOrderStatus(oId.toString(), status);
          syncLog.status = 'SUCCESS';
          syncLog.nextRetryAt = null;
          await integrationSyncLogRepository.save(syncLog);
        } catch (err: any) {
          const errorMsg = err?.message || 'Unknown POS status update error';
          syncLog.status = 'FAILED';
          syncLog.errorMessage = errorMsg;
          syncLog.errorLog = errorMsg;
          syncLog.nextRetryAt = new Date(Date.now() + this.calculateBackoffMs(1));
          await integrationSyncLogRepository.save(syncLog);
          logger.warn(`POS updateOrderStatus failed for restaurant ${rId}, order ${oId}: ${errorMsg}`);
        }
      } catch (outerErr: any) {
        logger.error(`Critical failure in POS updateOrderStatusAsync wrapper: ${outerErr?.message}`);
      }
    });
  }

  /**
   * Asynchronously sync menu data with the configured POS provider.
   */
  public async syncMenuAsync(restaurantId: string | Types.ObjectId): Promise<void> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;

    setImmediate(async () => {
      try {
        const settings = await restaurantSettingsRepository.findByRestaurantId(rId);
        const provider = settings?.paymentConfig?.integrationConfig?.provider || 'NONE';

        const syncLog = await integrationSyncLogRepository.create({
          restaurantId: rId,
          provider,
          operation: 'SYNC_MENU' as IntegrationSyncOperation,
          status: 'PENDING',
          syncAttempts: 1,
          maxRetries: this.MAX_RETRIES,
          lastAttemptAt: new Date(),
          payloadSnapshot: { restaurantId: rId.toString() },
        });

        try {
          const adapter = IntegrationFactory.getAdapter(provider);
          await adapter.syncMenu(rId.toString());
          syncLog.status = 'SUCCESS';
          syncLog.nextRetryAt = null;
          await integrationSyncLogRepository.save(syncLog);
        } catch (err: any) {
          const errorMsg = err?.message || 'Unknown POS menu sync error';
          syncLog.status = 'FAILED';
          syncLog.errorMessage = errorMsg;
          syncLog.errorLog = errorMsg;
          syncLog.nextRetryAt = new Date(Date.now() + this.calculateBackoffMs(1));
          await integrationSyncLogRepository.save(syncLog);
          logger.warn(`POS syncMenu failed for restaurant ${rId}: ${errorMsg}`);
        }
      } catch (outerErr: any) {
        logger.error(`Critical failure in POS syncMenuAsync wrapper: ${outerErr?.message}`);
      }
    });
  }

  /**
   * Background retry worker tick.
   * Processes all pending/failed logs eligible for retry.
   * Uses atomic lock to guarantee concurrency safety (no duplicate retries).
   */
  public async processPendingRetries(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();
    const candidateLogs = await integrationSyncLogRepository.findPendingRetries(now, 20);

    let succeeded = 0;
    let failed = 0;

    for (const log of candidateLogs) {
      // Atomic lock acquisition to prevent concurrent worker execution (Test E)
      const lockedLog = await integrationSyncLogRepository.lockForRetry(log._id, now);

      if (!lockedLog) continue; // Another worker locked it

      try {
        const settings = await restaurantSettingsRepository.findByRestaurantId(lockedLog.restaurantId);
        const provider = settings?.paymentConfig?.integrationConfig?.provider || lockedLog.provider || 'NONE';
        const adapter = IntegrationFactory.getAdapter(provider);

        if (lockedLog.operation === 'PUSH_ORDER' && lockedLog.orderId) {
          const order = await orderRepository.findById(lockedLog.orderId);
          if (order) {
            await adapter.pushOrder(order);
          }
        } else if (lockedLog.operation === 'UPDATE_STATUS' && lockedLog.orderId) {
          const status = lockedLog.payloadSnapshot?.status || 'PENDING';
          await adapter.updateOrderStatus(lockedLog.orderId.toString(), status);
        } else if (lockedLog.operation === 'SYNC_MENU') {
          await adapter.syncMenu(lockedLog.restaurantId.toString());
        }

        // Retry Succeeded
        lockedLog.status = 'SUCCESS';
        lockedLog.nextRetryAt = null;
        lockedLog.isLocked = false;
        await integrationSyncLogRepository.save(lockedLog);
        succeeded++;
      } catch (err: any) {
        const newAttempts = lockedLog.syncAttempts + 1;
        lockedLog.syncAttempts = newAttempts;
        lockedLog.errorMessage = err?.message || 'Retry attempt failed';
        lockedLog.errorLog = err?.message || 'Retry attempt failed';
        lockedLog.isLocked = false;

        if (newAttempts >= lockedLog.maxRetries) {
          // Exceeded max retries -> Require manual intervention
          lockedLog.status = 'MANUAL_INTERVENTION';
          lockedLog.nextRetryAt = null;
        } else {
          lockedLog.status = 'FAILED';
          lockedLog.nextRetryAt = new Date(Date.now() + this.calculateBackoffMs(newAttempts));
        }

        await integrationSyncLogRepository.save(lockedLog);
        failed++;
      }
    }

    return { processed: candidateLogs.length, succeeded, failed };
  }

  /**
   * Manual retry triggered by restaurant manager.
   */
  public async retrySyncLog(logId: string | Types.ObjectId): Promise<IIntegrationSyncLog> {
    const log = await integrationSyncLogRepository.findById(logId);
    if (!log) {
      throw new Error('Sync log not found');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(log.restaurantId);
    const provider = settings?.paymentConfig?.integrationConfig?.provider || log.provider || 'NONE';
    const adapter = IntegrationFactory.getAdapter(provider);

    log.lastAttemptAt = new Date();
    log.syncAttempts += 1;

    try {
      if (log.operation === 'PUSH_ORDER' && log.orderId) {
        const order = await orderRepository.findById(log.orderId);
        if (order) {
          await adapter.pushOrder(order);
        }
      } else if (log.operation === 'UPDATE_STATUS' && log.orderId) {
        const status = log.payloadSnapshot?.status || 'PENDING';
        await adapter.updateOrderStatus(log.orderId.toString(), status);
      } else if (log.operation === 'SYNC_MENU') {
        await adapter.syncMenu(log.restaurantId.toString());
      }

      log.status = 'SUCCESS';
      log.nextRetryAt = null;
      log.isLocked = false;
      await integrationSyncLogRepository.save(log);
      return log;
    } catch (err: any) {
      log.errorMessage = err?.message || 'Manual retry failed';
      log.errorLog = err?.message || 'Manual retry failed';
      log.isLocked = false;
      if (log.syncAttempts >= log.maxRetries) {
        log.status = 'MANUAL_INTERVENTION';
        log.nextRetryAt = null;
      } else {
        log.status = 'FAILED';
        log.nextRetryAt = new Date(Date.now() + this.calculateBackoffMs(log.syncAttempts));
      }
      await integrationSyncLogRepository.save(log);
      throw err;
    }
  }

  /**
   * Start the recurring background worker timer.
   */
  public startRetryWorker(intervalMs: number = 30000): void {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => {
      this.processPendingRetries().catch((err) => {
        logger.error('Error in POS background retry worker:', err);
      });
    }, intervalMs);
  }

  /**
   * Stop the recurring background worker timer (clean teardown in tests / shutdown).
   */
  public stopRetryWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  /**
   * Fetch sync logs for a restaurant (Manager / Admin monitoring).
   */
  public async getSyncLogs(
    restaurantId: string | Types.ObjectId,
    options: SyncLogQueryOptions = {}
  ): Promise<{ logs: IIntegrationSyncLog[]; total: number; page: number; limit: number }> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { restaurantId: rId };
    if (options.status) {
      query.status = options.status.toUpperCase();
    }

    const [logs, total] = await Promise.all([
      integrationSyncLogRepository.findByRestaurantId(rId, query, { createdAt: -1 }, skip, limit),
      integrationSyncLogRepository.countByRestaurantId(rId, query),
    ]);

    return { logs, total, page, limit };
  }
}

export const posIntegrationService = PosIntegrationService.getInstance();
export default posIntegrationService;
