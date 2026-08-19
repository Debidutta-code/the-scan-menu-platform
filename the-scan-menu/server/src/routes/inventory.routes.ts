import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });

router.use(requireAuth as any);
router.use(requireFeature('inventory') as any);
router.use(requireRestaurantAccess as any);

// Staff & Manager allowed to view logs and summary
router.get(
  '/logs',
  requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any,
  inventoryController.listInventoryLogs
);

router.get(
  '/summary',
  requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any,
  inventoryController.getInventorySummary
);

// Stocktake batch adjustments and Waste logging
router.post(
  '/batch-adjust',
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  inventoryController.batchAdjustStock
);

router.post(
  '/waste',
  requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any,
  inventoryController.logWaste
);

export default router;
