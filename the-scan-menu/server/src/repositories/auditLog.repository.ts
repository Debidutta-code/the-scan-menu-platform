import { ClientSession } from 'mongoose';
import { AuditLog, IAuditLog } from '../models/AuditLog';

export class AuditLogRepository {
  async create(data: Partial<IAuditLog>, session?: ClientSession): Promise<IAuditLog> {
    return AuditLog.create([data], { session }).then((docs: any[]) => docs[0]);
  }

  async findByRestaurantId(
    restaurantId: string,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<IAuditLog[]> {
    return AuditLog.find({ restaurantId, ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async countByRestaurantId(restaurantId: string, filter: Record<string, any> = {}): Promise<number> {
    return AuditLog.countDocuments({ restaurantId, ...filter });
  }
}

export const auditLogRepository = new AuditLogRepository();
