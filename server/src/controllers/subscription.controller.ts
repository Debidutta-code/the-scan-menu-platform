import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { subscriptionService } from '../services/subscription.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class SubscriptionController {
  constructor() {
    this.getAllPlans = this.getAllPlans.bind(this);
    this.getRestaurantPlan = this.getRestaurantPlan.bind(this);
    this.assignPlan = this.assignPlan.bind(this);
  }

  async getAllPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await subscriptionService.getAllPlans();
      sendSuccess(res, plans, 'Subscription plans retrieved successfully');
    } catch (error: any) {
      logger.error('Error fetching subscription plans:', error);
      next(error);
    }
  }

  async getRestaurantPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const plan = await subscriptionService.getRestaurantPlan(restaurantId);

      if (!plan) {
        sendError(res, 'NOT_FOUND', 'Subscription plan not found for this restaurant', null, 404);
        return;
      }

      sendSuccess(res, plan, 'Restaurant subscription plan retrieved successfully');
    } catch (error: any) {
      logger.error('Error fetching restaurant subscription plan:', error);
      next(error);
    }
  }

  async assignPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { planKey } = req.body;

      if (!planKey) {
        sendError(res, 'BAD_REQUEST', 'planKey is required', null, 400);
        return;
      }

      const validKeys = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
      if (!validKeys.includes(planKey)) {
        sendError(res, 'BAD_REQUEST', 'Invalid planKey provided', null, 400);
        return;
      }

      await subscriptionService.assignPlanToRestaurant(restaurantId, planKey);

      sendSuccess(res, { planKey }, 'Subscription plan assigned and feature flags synced successfully');
    } catch (error: any) {
      logger.error('Error assigning subscription plan:', error);
      if (error.message.includes('not found')) {
        sendError(res, 'NOT_FOUND', error.message, null, 404);
        return;
      }
      next(error);
    }
  }
}

export default new SubscriptionController();
