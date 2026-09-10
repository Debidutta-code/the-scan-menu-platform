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
      const user = (req as any).user;
      if (user?.role === 'SUPER_ADMIN') {
        return next();
      }
      let restaurantId = req.params.restaurantId || req.body.restaurantId || (req as any).restaurant?.id;

      if (!restaurantId && req.originalUrl) {
        const match = req.originalUrl.match(/\/restaurants\/([a-fA-F0-9]{24})/);
        if (match) {
          restaurantId = match[1];
        }
      }

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

export const requireAnyFeature = (featureKeys: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (config.app.isTest && !process.env.TESTING_FEATURE_FLAGS) {
        return next();
      }
      const user = (req as any).user;
      if (user?.role === 'SUPER_ADMIN') {
        return next();
      }
      let restaurantId = req.params.restaurantId || req.body.restaurantId || (req as any).restaurant?.id;

      if (!restaurantId && req.originalUrl) {
        const match = req.originalUrl.match(/\/restaurants\/([a-fA-F0-9]{24})/);
        if (match) {
          restaurantId = match[1];
        }
      }

      if (!restaurantId) {
        res.status(400).json({ success: false, message: 'Restaurant ID is required for feature flag check' });
        return;
      }

      if (!Types.ObjectId.isValid(restaurantId)) {
        res.status(400).json({ success: false, message: 'Invalid Restaurant ID' });
        return;
      }

      let isAnyEnabled = false;
      for (const key of featureKeys) {
        const enabled = await featureFlagService.isEnabled(restaurantId, key);
        if (enabled) {
          isAnyEnabled = true;
          break;
        }
      }

      if (!isAnyEnabled) {
        res.status(403).json({
          success: false,
          message: `At least one feature of [${featureKeys.join(', ')}] must be enabled for this restaurant.`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking any feature flag:', error);
      res.status(500).json({ success: false, message: 'Internal server error while checking feature flag' });
    }
  };
};

