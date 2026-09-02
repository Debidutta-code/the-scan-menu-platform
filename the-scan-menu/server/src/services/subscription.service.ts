import { ISubscriptionPlan } from '../models/SubscriptionPlan';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { featureFlagService, DEFAULT_FLAGS } from './featureFlag.service';
import { Types, ClientSession } from 'mongoose';

export class SubscriptionService {
  /**
   * Retrieves all available subscription plans.
   */
  async getAllPlans(): Promise<ISubscriptionPlan[]> {
    return subscriptionRepository.findAll();
  }

  /**
   * Retrieves a specific subscription plan by its key.
   */
  async getPlanByKey(key: string): Promise<ISubscriptionPlan | null> {
    return subscriptionRepository.findByKey(key);
  }

  /**
   * Retrieves the current subscription plan for a given restaurant.
   */
  async getRestaurantPlan(restaurantId: string | Types.ObjectId): Promise<ISubscriptionPlan | null> {
    const restaurant = await restaurantRepository.findById(restaurantId);
    if (!restaurant || !restaurant.subscription) {
      return null;
    }
    return subscriptionRepository.findByKey(restaurant.subscription.planKey);
  }

  /**
   * Assigns a new subscription plan to a restaurant and strictly syncs its feature flags.
   */
  async assignPlanToRestaurant(restaurantId: string | Types.ObjectId, planKey: string, session?: ClientSession): Promise<void> {
    const plan = await this.getPlanByKey(planKey);
    if (!plan) {
      throw new Error(`Subscription plan ${planKey} not found`);
    }

    // 1. Update the Restaurant's subscription plan
    await restaurantRepository.updateById(restaurantId, {
      'subscription.planKey': planKey,
    } as any, session);

    // 2. Sync Feature Flags
    // Create an array of updates for all DEFAULT_FLAGS
    // Any flag in the plan's includedFeatureKeys is true, everything else is false.
    const includedFlagsSet = new Set(plan.includedFeatureKeys);
    const flagUpdates = DEFAULT_FLAGS.map((flag) => ({
      key: flag.key,
      enabled: includedFlagsSet.has(flag.key),
    }));

    await featureFlagService.bulkUpdate(restaurantId, flagUpdates, session);
  }
}

export const subscriptionService = new SubscriptionService();

