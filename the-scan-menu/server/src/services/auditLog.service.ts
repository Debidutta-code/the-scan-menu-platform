import { auditLogRepository } from '../repositories/auditLog.repository';
import { AuditLogSeverity } from '../models/AuditLog';
import logger from '../utils/logger';

export class AuditLogService {
  /**
   * Records a platform audit event asynchronously in MongoDB and writes to system logger.
   */
  async logEvent(params: {
    action: string;
    actorId?: string;
    actorName?: string;
    actorRole?: string;
    restaurantId?: string;
    restaurantName?: string;
    details?: Record<string, any>;
    severity?: AuditLogSeverity;
  }) {
    try {
      const severity = params.severity || 'INFO';

      await auditLogRepository.create({
        action: params.action,
        actorId: params.actorId,
        actorName: params.actorName,
        actorRole: params.actorRole,
        restaurantId: params.restaurantId,
        restaurantName: params.restaurantName,
        details: params.details,
        severity,
      });

      logger.info(`[AUDIT_LOG] ${params.action} by ${params.actorName || 'System'} (${params.actorRole || 'SYSTEM'}) - ${params.restaurantName || 'Global'}`);
    } catch (err: any) {
      logger.error(`[AuditLogService Error] Failed to write audit log: ${err.message}`);
    }
  }

  /**
   * Queries audit logs with pagination and filters.
   */
  async queryLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    severity?: string;
    restaurantId?: string;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (params.action && params.action !== 'ALL') {
      query.action = params.action;
    }
    if (params.severity && params.severity !== 'ALL') {
      query.severity = params.severity;
    }
    if (params.restaurantId && params.restaurantId !== 'ALL') {
      query.restaurantId = params.restaurantId;
    }
    if (params.search) {
      query.$or = [
        { action: { $regex: params.search, $options: 'i' } },
        { actorName: { $regex: params.search, $options: 'i' } },
        { restaurantName: { $regex: params.search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      auditLogRepository.findByRestaurantId(query.restaurantId || '', query, { createdAt: -1 }, skip, limit),
      auditLogRepository.countByRestaurantId(query.restaurantId || '', query),
    ]);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
