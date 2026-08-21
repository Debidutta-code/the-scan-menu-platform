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
      const flags = await featureFlagService.getEnrichedFlags(restaurantId);

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

      // Enforce Chained Dependencies
      const flagMap = new Map<string, boolean>();
      flags.forEach((f) => {
        if (f.key && typeof f.enabled === 'boolean') {
          flagMap.set(f.key, f.enabled);
        }
      });

      // Chain rules logic
      if (flagMap.get('ordering') === true) {
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('kds') === true) {
        flagMap.set('ordering', true);
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('customer_display') === true) {
        flagMap.set('ordering', true);
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('waiter_call') === true) {
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('takeaway') === true) {
        flagMap.set('ordering', true);
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('delivery') === true) {
        flagMap.set('ordering', true);
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('pos') === true) {
        flagMap.set('ordering', true);
        flagMap.set('qr_menu', true);
      }
      if (flagMap.get('coupons') === true) {
        flagMap.set('crm', true);
      }
      if (flagMap.get('loyalty') === true) {
        flagMap.set('crm', true);
      }

      // Reconstruct flags array to send to service
      const processedFlags = Array.from(flagMap.entries()).map(([key, enabled]) => ({ key, enabled }));

      const updatedFlags = await featureFlagService.bulkUpdate(restaurantId, processedFlags);

      sendSuccess(res, updatedFlags, 'Feature flags updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new FeatureFlagController();
