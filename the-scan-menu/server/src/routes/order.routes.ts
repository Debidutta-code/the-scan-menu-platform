import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { requireFeature } from '../middleware/featureFlag';
import { requireAuth, requireRestaurantAccess, requireRole } from '../middleware/auth';

const router = Router({ mergeParams: true });
const orderController = new OrderController();

// Require authentication for all manager/staff order routes
router.use(requireAuth as any);

// Scoped inside a restaurantId parameter
// NOTE: path is /orders/analytics (not /analytics) to avoid shadowing the dedicated analytics sub-router
router.get('/:restaurantId/orders/analytics', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, orderController.getAnalytics);
router.get('/:restaurantId/orders/active', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.listActiveOrders);
router.get('/:restaurantId/orders', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.listOrders);
router.get('/:restaurantId/orders/:orderId', requireFeature('ordering') as any, requireRestaurantAccess as any, orderController.getOrderDetails);
router.patch('/:restaurantId/orders/:orderId/status', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.updateOrderStatus);
router.post('/:restaurantId/orders/:orderId/cancel', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.cancelOrder);
router.post('/:restaurantId/orders/:orderId/clear', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.clearOrder);
router.post('/:restaurantId/orders/:orderId/retry-pos', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, orderController.retryPosSync);

// Rapid Counter Order Entry (Staff & Manager)
router.post('/:restaurantId/orders/counter', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.createCounterOrder);

// Item status tick transitions
router.patch('/:restaurantId/orders/:orderId/items/:itemIndex/status', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.updateItemStatus);

// Table Session & Table Orders management
router.get('/:restaurantId/tables/:tableId/orders', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.getTableOrders);
router.get('/:restaurantId/table-sessions/:sessionId', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.getTableSession);
router.post('/:restaurantId/table-sessions/:sessionId/settle', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.settleTableSession);
router.post('/:restaurantId/table-sessions/:sessionId/close', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.closeTableSession);
router.post('/:restaurantId/table-sessions/:sessionId/reopen', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, orderController.reopenTableSession);
router.post('/:restaurantId/table-sessions/:sessionId/abandon', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, orderController.abandonTableSession);

export default router;
