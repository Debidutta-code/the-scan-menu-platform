import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });

// Require auth, analytics feature flag, tenant membership, and appropriate staff/manager role
router.use(requireAuth as any);
router.use(requireFeature('analytics') as any);
router.use(requireRestaurantAccess as any);
router.use(requireRole('MANAGER', 'SUPER_ADMIN') as any);

router.get('/summary', analyticsController.getSummary);
router.get('/top-items', analyticsController.getTopItems);
router.get('/peak-hours', analyticsController.getPeakHours);
router.get('/', analyticsController.getOverview);

export default router;
