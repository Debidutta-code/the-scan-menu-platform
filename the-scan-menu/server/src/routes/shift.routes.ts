import { Router } from 'express';
import { shiftController } from '../controllers/shift.controller';
import { requireAuth, requireRestaurantAccess, requireRole } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });

router.use(requireAuth as any);
router.use(requireFeature('pos') as any);
router.use(requireRestaurantAccess as any);

// Current Active Shift
router.get('/:restaurantId/shifts/current', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, shiftController.getCurrentShift);

// Open a new shift
router.post('/:restaurantId/shifts/open', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, shiftController.openShift);

// Record Petty Cash (In / Out)
router.post('/:restaurantId/shifts/:shiftId/petty-cash', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, shiftController.recordPettyCash);

// Close Shift
router.post('/:restaurantId/shifts/:shiftId/close', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, shiftController.closeShift);

// X-Report (Mid-Shift)
router.get('/:restaurantId/shifts/reports/x-report', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, shiftController.getXReport);

// Z-Report (Day/Shift Close)
router.get('/:restaurantId/shifts/:shiftId/z-report', requireRole('MANAGER', 'SUPER_ADMIN') as any, shiftController.getZReport);

// Shift History
router.get('/:restaurantId/shifts', requireRole('MANAGER', 'SUPER_ADMIN') as any, shiftController.listShiftHistory);

export default router;
