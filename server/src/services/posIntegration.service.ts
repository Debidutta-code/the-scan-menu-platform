import { Types } from 'mongoose';
import { IntegrationSyncLog, IIntegrationSyncLog, IntegrationSyncOperation } from '../models/IntegrationSyncLog';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { IntegrationFactory } from '../integrations/core/IntegrationFactory';
import { logger } from '../utils/logger';

export interface SyncLogQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export class PosIntegrationService {
  private static instance: PosIntegrationService;

  public static getInstance(): PosIntegrationService {
    if (!PosIntegrationService.instance) {
      PosIntegrationService.instance = new PosIntegrationService();
    }
    return PosIntegrationService.instance;
  }

  /**
   * Asynchronously push an order to the configured POS provider.
   * Completely non-blocking: errors are logged to IntegrationSyncLog and never thrown to caller.
   */
  public async pushOrderAsync(restaurantId: string | Types.ObjectId, order: any): Promise<void> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;
    const oId = order?._id ? (typeof order._id === 'string' ? new Types.ObjectId(order._id) : order._id) : undefined;

    setImmediate(async () => {
      try {
        const settings = await RestaurantSettings.findOne({ restaurantId: rId });
        const provider = settings?.paymentConfig?.integrationConfig?.provider || 'NONE';

        const syncLog = new IntegrationSyncLog({
          restaurantId: rId,
          orderId: oId,
          provider,
          operation: 'PUSH_ORDER' as IntegrationSyncOperation,
          status: 'PENDING',
          syncAttempts: 1,
          payloadSnapshot: {
            orderNumber: order?.orderNumber,
            total: order?.total,
            itemsCount: order?.items?.length || 0,
            orderMode: order?.orderMode,
          },
        });
        await syncLog.save();

        try {
          const adapter = IntegrationFactory.getAdapter(provider);
          await adapter.pushOrder(order);
          syncLog.status = 'SUCCESS';
          await syncLog.save();
        } catch (err: any) {
          syncLog.status = 'FAILED';
          const errorMsg = err?.message || 'Unknown POS push error';
          syncLog.errorMessage = errorMsg;
          syncLog.errorLog = errorMsg;
          await syncLog.save();
          logger.warn(`POS pushOrder failed for restaurant ${rId}, order ${oId}: ${errorMsg}`);
        }
      } catch (outerErr: any) {
        logger.error(`Critical failure in POS pushOrderAsync wrapper: ${outerErr?.message}`);
      }
    });
  }

  /**
   * Asynchronously update order status in the configured POS provider.
   * Completely non-blocking.
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
        const settings = await RestaurantSettings.findOne({ restaurantId: rId });
        const provider = settings?.paymentConfig?.integrationConfig?.provider || 'NONE';

        const syncLog = new IntegrationSyncLog({
          restaurantId: rId,
          orderId: oId,
          provider,
          operation: 'UPDATE_STATUS' as IntegrationSyncOperation,
          status: 'PENDING',
          syncAttempts: 1,
          payloadSnapshot: { status },
        });
        await syncLog.save();

        try {
          const adapter = IntegrationFactory.getAdapter(provider);
          await adapter.updateOrderStatus(oId.toString(), status);
          syncLog.status = 'SUCCESS';
          await syncLog.save();
        } catch (err: any) {
          syncLog.status = 'FAILED';
          const errorMsg = err?.message || 'Unknown POS status update error';
          syncLog.errorMessage = errorMsg;
          syncLog.errorLog = errorMsg;
          await syncLog.save();
          logger.warn(`POS updateOrderStatus failed for restaurant ${rId}, order ${oId}: ${errorMsg}`);
        }
      } catch (outerErr: any) {
        logger.error(`Critical failure in POS updateOrderStatusAsync wrapper: ${outerErr?.message}`);
      }
    });
  }

  /**
   * Asynchronously sync menu data with the configured POS provider.
   * Completely non-blocking.
   */
  public async syncMenuAsync(restaurantId: string | Types.ObjectId): Promise<void> {
    const rId = typeof restaurantId === 'string' ? new Types.ObjectId(restaurantId) : restaurantId;

    setImmediate(async () => {
      try {
        const settings = await RestaurantSettings.findOne({ restaurantId: rId });
        const provider = settings?.paymentConfig?.integrationConfig?.provider || 'NONE';

        const syncLog = new IntegrationSyncLog({
          restaurantId: rId,
          provider,
          operation: 'SYNC_MENU' as IntegrationSyncOperation,
          status: 'PENDING',
          syncAttempts: 1,
          payloadSnapshot: { restaurantId: rId.toString() },
        });
        await syncLog.save();

        try {
          const adapter = IntegrationFactory.getAdapter(provider);
          await adapter.syncMenu(rId.toString());
          syncLog.status = 'SUCCESS';
          await syncLog.save();
        } catch (err: any) {
          syncLog.status = 'FAILED';
          const errorMsg = err?.message || 'Unknown POS menu sync error';
          syncLog.errorMessage = errorMsg;
          syncLog.errorLog = errorMsg;
          await syncLog.save();
          logger.warn(`POS syncMenu failed for restaurant ${rId}: ${errorMsg}`);
        }
      } catch (outerErr: any) {
        logger.error(`Critical failure in POS syncMenuAsync wrapper: ${outerErr?.message}`);
      }
    });
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
      IntegrationSyncLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      IntegrationSyncLog.countDocuments(query),
    ]);

    return { logs, total, page, limit };
  }
}

export const posIntegrationService = PosIntegrationService.getInstance();
export default posIntegrationService;
