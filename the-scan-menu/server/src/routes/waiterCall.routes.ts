import { Router } from 'express';
import { WaiterCallController } from '../controllers/waiterCall.controller';
import { requireAuth, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });
const waiterCallController = new WaiterCallController();

// STAFF/MANAGER Endpoints (Require Auth + Feature Flag + requireRestaurantAccess)
router.use(requireAuth as any);
router.use(requireFeature('waiter_call') as any);
router.use(requireRestaurantAccess as any);

router.get(
  '/:restaurantId/waiter-calls',
  waiterCallController.listWaiterCalls
);
router.patch(
  '/:restaurantId/waiter-calls/:callId/acknowledge',
  waiterCallController.acknowledgeWaiterCall
);
router.patch(
  '/:restaurantId/waiter-calls/:callId/resolve',
  waiterCallController.resolveWaiterCall
);

export default router;
