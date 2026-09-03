import { Types, ClientSession } from 'mongoose';
import { featureFlagRepository } from '../repositories/featureFlag.repository';
import { restaurantRepository } from '../repositories/restaurant.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { logger } from '../utils/logger';
import config from '../config';

export interface FeatureFlagMeta {
  key: string;
  name: string;
  category: 'GUEST_EXPERIENCE' | 'OPERATIONS' | 'FINANCE' | 'MARKETING' | 'INTEGRATIONS';
  description: string;
}

export const DEFAULT_FLAGS: FeatureFlagMeta[] = [
  // 1. Guest Experience
  {
    key: 'qr_menu',
    name: 'Digital QR Menu',
    category: 'GUEST_EXPERIENCE',
    description: 'Digital contactless menu browsing, dish photography, and dietary tags.',
  },
  {
    key: 'ordering',
    name: 'Table Ordering',
    category: 'GUEST_EXPERIENCE',
    description: 'Dine-in multi-round table ordering, live cart, and guest sessions.',
  },
  {
    key: 'waiter_call',
    name: 'Waiter Call Assistance',
    category: 'GUEST_EXPERIENCE',
    description: 'Instant table assistance, bill requests, and floor waiter notifications.',
  },
  {
    key: 'customer_display',
    name: 'Customer Live Display',
    category: 'GUEST_EXPERIENCE',
    description: 'Customer-facing live order queue and kitchen status tracking screen.',
  },
  {
    key: 'customer_otp',
    name: 'Customer SMS OTP Verification',
    category: 'GUEST_EXPERIENCE',
    description: 'Mandatory 4-digit SMS OTP verification for diners before placing orders.',
  },

  // 2. Kitchen & Operations
  {
    key: 'mobile_app',
    name: 'Captain Mobile App Access',
    category: 'OPERATIONS',
    description: 'Staff & Captain Android / iOS mobile ordering, waiter call alerts, and live table management app.',
  },
  {
    key: 'kds',
    name: 'Kitchen Display System (KDS)',
    category: 'OPERATIONS',
    description: 'Interactive kitchen screen with item status, station routing, and ticket bump bar.',
  },
  {
    key: 'inventory',
    name: 'Inventory & Stock Control',
    category: 'OPERATIONS',
    description: 'POS-grade live stock tracking, low stock alerts, stocktake, and waste logging.',
  },
  {
    key: 'pos',
    name: 'Counter POS Workstation',
    category: 'OPERATIONS',
    description: 'High-speed keyboard & touch counter billing, split bills, and quick tender.',
  },
  {
    key: 'takeaway',
    name: 'Takeaway & Pickup Mode',
    category: 'OPERATIONS',
    description: 'Takeaway order workflows, ready notifications, and pickup counters.',
  },
  {
    key: 'delivery',
    name: 'Direct Delivery Orders',
    category: 'OPERATIONS',
    description: 'Direct restaurant delivery management and address dispatch workflows.',
  },

  // 3. Finance & Billing
  {
    key: 'payments',
    name: 'Digital Payments Integration',
    category: 'FINANCE',
    description: 'Online payment gateways (Razorpay, UPI QR, Cards) and automated refunds.',
  },
  {
    key: 'analytics',
    name: 'Analytics & Insights',
    category: 'FINANCE',
    description: 'Real-time sales dashboard, popular items, revenue trends, and operational metrics.',
  },

  // 4. Marketing & Growth
  {
    key: 'coupons',
    name: 'Coupons & Promotions',
    category: 'MARKETING',
    description: 'Promotional discount codes, percentage / flat offers, and minimum spend rules.',
  },
  {
    key: 'loyalty',
    name: 'Customer Loyalty Program',
    category: 'MARKETING',
    description: 'Customer points accumulation, loyalty tiers, and checkout rewards redemption.',
  },
  {
    key: 'crm',
    name: 'CRM & Guest Directory',
    category: 'MARKETING',
    description: 'Customer profiles, visit histories, dining preferences, and feedback logs.',
  },

  // 5. Integrations & Developer
  {
    key: 'pos_integration',
    name: 'External POS Integration',
    category: 'INTEGRATIONS',
    description: 'Bi-directional menu, order, and bill syncing with Petpooja & UrbanPiper.',
  },
  {
    key: 'api_webhooks',
    name: 'API Keys & Webhooks',
    category: 'INTEGRATIONS',
    description: 'Developer REST API credentials, webhook endpoints, and event subscriptions.',
  },
  {
    key: 'api_access',
    name: '3rd-Party API Access',
    category: 'INTEGRATIONS',
    description: 'Secure programmatic access for custom third-party integrations and bots.',
  },
  {
    key: 'white_label',
    name: 'White Label & Custom Branding',
    category: 'INTEGRATIONS',
    description: 'Custom domain names, personalized logos, colors, and white-label theming.',
  },
];

export class FeatureFlagService {
  /**
   * Retrieves all feature flags for a given restaurant.
   * If they do not exist, it seeds the default flags and returns them.
   */
  async getRestaurantFlags(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    let flags = await featureFlagRepository.findByRestaurantId(restaurantId);

    if (flags.length === 0) {
      await this.seedDefaultFlags(restaurantId, session);
      flags = await featureFlagRepository.findByRestaurantId(restaurantId);
    }

    return flags;
  }

  /**
   * Retrieves enriched feature flags with names, categories, and descriptions for client/UI consumption.
   */
  async getEnrichedFlags(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    const flags = await this.getRestaurantFlags(restaurantId, session);
    const flagMetaMap = new Map(DEFAULT_FLAGS.map((f) => [f.key, f]));

    return flags.map((flag: any) => {
      const meta = flagMetaMap.get(flag.key);
      const raw = flag.toObject ? flag.toObject() : flag;
      return {
        ...raw,
        name: meta?.name || flag.key.replace(/_/g, ' '),
        category: meta?.category || 'OPERATIONS',
        description: flag.description || meta?.description || '',
      };
    });
  }

  /**
   * Checks if a specific feature flag is enabled for a given restaurant.
   */
  async isEnabled(restaurantId: string | Types.ObjectId, key: string): Promise<boolean> {
    if (config.app.isTest && !process.env.TESTING_FEATURE_FLAGS) {
      return true;
    }

    const flag = await featureFlagRepository.findByKeyAndRestaurant(key, restaurantId);
    if (flag !== null) {
      return flag.enabled;
    }

    // If flag doc does not exist yet, check restaurant subscription plan
    try {
      const restaurant = await restaurantRepository.findById(restaurantId);
      if (restaurant?.subscription?.planKey) {
        const plan = await subscriptionRepository.findByKey(restaurant.subscription.planKey);
        if (plan) {
          return plan.includedFeatureKeys.includes(key);
        }
      }
    } catch (err) {
      logger.warn(`Failed to inspect fallback subscription plan for flag '${key}':`, err);
    }

    return false;
  }

  /**
   * Enables a specific feature flag for a given restaurant.
   */
  async enable(restaurantId: string | Types.ObjectId, key: string) {
    return featureFlagRepository.upsert(restaurantId, key, true);
  }

  /**
   * Disables a specific feature flag for a given restaurant.
   */
  async disable(restaurantId: string | Types.ObjectId, key: string) {
    return featureFlagRepository.upsert(restaurantId, key, false);
  }

  /**
   * Bulk updates multiple feature flags for a given restaurant.
   */
  async bulkUpdate(restaurantId: string | Types.ObjectId, updates: { key: string; enabled: boolean }[], session?: ClientSession) {
    await Promise.all(
      updates.map((update) =>
        featureFlagRepository.upsert(restaurantId, update.key, update.enabled, undefined, session)
      )
    );
    return this.getRestaurantFlags(restaurantId, session);
  }

  /**
   * Seeds the default flags for a given restaurant.
   */
  public async seedDefaultFlags(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    await Promise.all(
      DEFAULT_FLAGS.map((flag) =>
        featureFlagRepository.upsert(restaurantId, flag.key, false, flag.description, session)
      )
    );
  }
}

export const featureFlagService = new FeatureFlagService();

