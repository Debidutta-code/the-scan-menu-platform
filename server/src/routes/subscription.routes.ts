import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';

export const globalSubscriptionRoutes = Router();

// Global plans fetch (Any authenticated user can fetch plans)
globalSubscriptionRoutes.get('/', requireAuth as any, subscriptionController.getAllPlans);

export const restaurantSubscriptionRoutes = Router({ mergeParams: true });

// Restaurant specific subscription routes
restaurantSubscriptionRoutes.get(
  '/:restaurantId/subscription',
  requireAuth as any,
  requireRestaurantAccess as any,
  subscriptionController.getRestaurantPlan
);

restaurantSubscriptionRoutes.patch(
  '/:restaurantId/subscription',
  requireAuth as any,
  requireRole('SUPER_ADMIN') as any, // Only SUPER_ADMIN can assign/change plans
  subscriptionController.assignPlan
);
