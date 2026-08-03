import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { posIntegrationService } from '../services/posIntegration.service';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class IntegrationController {
  constructor() {
    this.getSyncLogs = this.getSyncLogs.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/integrations/sync-logs
   * Manager / Super Admin only.
   */
  async getSyncLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'BAD_REQUEST', 'Invalid restaurant ID format', null, 400);
        return;
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status ? (req.query.status as string) : undefined;

      const result = await posIntegrationService.getSyncLogs(restaurantId, { page, limit, status });

      sendSuccess(res, result, 'Integration sync logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const integrationController = new IntegrationController();
export default integrationController;
