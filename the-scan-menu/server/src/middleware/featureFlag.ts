import { Request, Response, NextFunction } from 'express';
import { featureFlagService } from '../services/featureFlag.service';
import { Types } from 'mongoose';
import config from '../config';

export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (config.app.isTest && !process.env.TESTING_FEATURE_FLAGS) {
        return next();
      }
      const restaurantId = req.params.restaurantId || req.body.restaurantId || (req as any).restaurant?.id;

      if (!restaurantId) {
        res.status(400).json({ success: false, message: 'Restaurant ID is required for feature flag check' });
        return;
      }

      if (!Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ success: false, message: 'Invalid Restaurant ID' });
        return;
      }

      const isEnabled = await featureFlagService.isEnabled(restaurantId, featureKey);

      if (!isEnabled) {
        res.status(403).json({ success: false, message: `Feature '${featureKey}' is disabled for this restaurant.` });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking feature flag:', error);
      res.status(500).json({ success: false, message: 'Internal server error while checking feature flag' });
    }
  };
};
