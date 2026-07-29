import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { requireFeature } from '../middleware/featureFlag';
import { requireAuth, requireRestaurantAccess, requireRole } from '../middleware/auth';

const router = Router({ mergeParams: true });
const orderController = new OrderController();

// Require authentication for all manager/staff order routes
router.use(requireAuth as any);

// Scoped inside a restaurantId parameter
router.get('/:restaurantId/analytics', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, orderController.getAnalytics);
router.get('/:restaurantId/orders', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.listOrders);
router.get('/:restaurantId/orders/active', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.listActiveOrders);
router.get('/:restaurantId/orders/:orderId', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.getOrderDetails);
router.patch('/:restaurantId/orders/:orderId/status', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.updateOrderStatus);
router.post('/:restaurantId/orders/:orderId/cancel', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.cancelOrder);

// Item status tick transitions
router.patch('/:restaurantId/orders/:orderId/items/:itemIndex/status', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.updateItemStatus);

// Table Session management
router.get('/:restaurantId/table-sessions/:sessionId', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.getTableSession);
router.post('/:restaurantId/table-sessions/:sessionId/close', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.closeTableSession);

export default router;
