import { Router } from 'express';
import { WaiterCallController } from '../controllers/waiterCall.controller';
import { requireAuth, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });
const waiterCallController = new WaiterCallController();

// Require authentication for all waiter call routes
router.use(requireAuth as any);

router.get(
  '/:restaurantId/waiter-calls',
  requireFeature('waiter_call') as any,
  requireRestaurantAccess as any,
  waiterCallController.listWaiterCalls
);
router.patch(
  '/:restaurantId/waiter-calls/:callId/acknowledge',
  requireFeature('waiter_call') as any,
  requireRestaurantAccess as any,
  waiterCallController.acknowledgeWaiterCall
);
router.patch(
  '/:restaurantId/waiter-calls/:callId/resolve',
  requireFeature('waiter_call') as any,
  requireRestaurantAccess as any,
  waiterCallController.resolveWaiterCall
);

export default router;
