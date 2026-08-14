import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { featureFlagService } from '../services/featureFlag.service';
import { sendSuccess } from '../utils/response';

export class FeatureFlagController {
  constructor() {
    this.getFeatureFlags = this.getFeatureFlags.bind(this);
    this.updateFeatureFlags = this.updateFeatureFlags.bind(this);
  }

  /**
   * Get all feature flags for a specific restaurant
   * GET /api/v1/restaurants/:restaurantId/feature-flags
   */
  async getFeatureFlags(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const flags = await featureFlagService.getRestaurantFlags(restaurantId);

      sendSuccess(res, flags, 'Feature flags retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update feature flags for a specific restaurant
   * PATCH /api/v1/restaurants/:restaurantId/feature-flags
   */
  async updateFeatureFlags(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { flags } = req.body; // Expecting an array of { key: string, enabled: boolean }

      if (!Array.isArray(flags)) {
        res.status(400).json({ success: false, message: 'Flags must be an array of objects' });
        return;
      }

      const updatedFlags = await featureFlagService.bulkUpdate(restaurantId, flags);

      sendSuccess(res, updatedFlags, 'Feature flags updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new FeatureFlagController();
