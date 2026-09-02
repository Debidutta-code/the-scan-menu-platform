import { Types, ClientSession } from 'mongoose';
import { IntegrationSyncLog, IIntegrationSyncLog, IntegrationSyncOperation, IntegrationSyncStatus } from '../models/IntegrationSyncLog';

export class IntegrationSyncLogRepository {
  async findById(id: string | Types.ObjectId): Promise<IIntegrationSyncLog | null> {
    return IntegrationSyncLog.findById(id);
  }

  async findByOrderId(orderId: string | Types.ObjectId): Promise<IIntegrationSyncLog | null> {
    return IntegrationSyncLog.findOne({ orderId: new Types.ObjectId(orderId.toString()) }).sort({ createdAt: -1 });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<IIntegrationSyncLog[]> {
    return IntegrationSyncLog.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return IntegrationSyncLog.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async findPendingRetries(beforeDate: Date, limit = 50): Promise<IIntegrationSyncLog[]> {
    return IntegrationSyncLog.find({
      status: { $in: ['PENDING', 'RETRYING', 'FAILED'] },
      nextRetryAt: { $lte: beforeDate },
      isLocked: { $ne: true },
    }).limit(limit);
  }

  async create(data: Partial<IIntegrationSyncLog>, session?: ClientSession): Promise<IIntegrationSyncLog> {
    const log = new IntegrationSyncLog(data);
    return log.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IIntegrationSyncLog>, session?: ClientSession): Promise<IIntegrationSyncLog | null> {
    return IntegrationSyncLog.findByIdAndUpdate(id, data, { new: true, session });
  }

  async lockForRetry(id: string | Types.ObjectId, lastAttemptAt: Date): Promise<IIntegrationSyncLog | null> {
    return IntegrationSyncLog.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()), isLocked: { $ne: true } },
      { $set: { isLocked: true, status: 'RETRYING', lastAttemptAt } },
      { new: true }
    );
  }

  async save(log: IIntegrationSyncLog, session?: ClientSession): Promise<IIntegrationSyncLog> {
    return log.save({ session });
  }
}

export const integrationSyncLogRepository = new IntegrationSyncLogRepository();
