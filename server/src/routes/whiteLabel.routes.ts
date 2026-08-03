import { Router } from 'express';
import { whiteLabelController } from '../controllers/whiteLabel.controller';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });

// Protected manager routes for configuring white label (gated by white_label feature flag)
router.get('/', requireAuth as any, requireFeature('white_label') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, whiteLabelController.getConfig);
router.patch('/', requireAuth as any, requireFeature('white_label') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, whiteLabelController.updateConfig);

export default router;
