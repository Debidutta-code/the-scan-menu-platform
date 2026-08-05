import { FeatureFlag } from '../models/FeatureFlag';
import { Types, ClientSession } from 'mongoose';

export const DEFAULT_FLAGS = [
  { key: 'qr_menu', description: 'Enable QR Code Menu functionality' },
  { key: 'ordering', description: 'Enable Ordering functionality' },
  { key: 'waiter_call', description: 'Enable Waiter Call functionality' },
  { key: 'analytics', description: 'Enable Analytics Dashboard' },
  { key: 'payments', description: 'Enable Payments integration' },
  { key: 'kds', description: 'Enable Kitchen Display System' },
  { key: 'inventory', description: 'Enable Inventory management' },
  { key: 'customer_display', description: 'Enable Customer Display Screen' },
  { key: 'delivery', description: 'Enable Delivery module' },
  { key: 'takeaway', description: 'Enable Takeaway module' },
  { key: 'white_label', description: 'Enable White Label features' },
  { key: 'pos_integration', description: 'Enable POS integration' },
  { key: 'coupons', description: 'Enable Coupons and Promotions' },
  { key: 'loyalty', description: 'Enable Loyalty Program' },
  { key: 'crm', description: 'Enable Customer Relationship Management' },
  { key: 'api_webhooks', description: 'Enable Developer API & Webhooks access' },
];

export class FeatureFlagService {
  /**
   * Retrieves all feature flags for a given restaurant.
   * If they do not exist, it seeds the default flags and returns them.
   */
  async getRestaurantFlags(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    const query = FeatureFlag.find({ restaurantId });
    if (session) query.session(session);
    let flags = await query;

    if (flags.length === 0) {
      await this.seedDefaultFlags(restaurantId, session);
      const reQuery = FeatureFlag.find({ restaurantId });
      if (session) reQuery.session(session);
      flags = await reQuery;
    }

    return flags;
  }

  /**
   * Checks if a specific feature flag is enabled for a given restaurant.
   */
  async isEnabled(restaurantId: string | Types.ObjectId, key: string): Promise<boolean> {
    const flag = await FeatureFlag.findOne({ restaurantId, key });
    return flag ? flag.enabled : false;
  }

  /**
   * Enables a specific feature flag for a given restaurant.
   */
  async enable(restaurantId: string | Types.ObjectId, key: string) {
    return await FeatureFlag.findOneAndUpdate(
      { restaurantId, key },
      { enabled: true },
      { new: true, upsert: true }
    );
  }

  /**
   * Disables a specific feature flag for a given restaurant.
   */
  async disable(restaurantId: string | Types.ObjectId, key: string) {
    return await FeatureFlag.findOneAndUpdate(
      { restaurantId, key },
      { enabled: false },
      { new: true, upsert: true }
    );
  }

  /**
   * Bulk updates multiple feature flags for a given restaurant.
   */
  async bulkUpdate(restaurantId: string | Types.ObjectId, updates: { key: string; enabled: boolean }[], session?: ClientSession) {
    const operations = updates.map((update) => ({
      updateOne: {
        filter: { restaurantId, key: update.key },
        update: { $set: { enabled: update.enabled } },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await FeatureFlag.bulkWrite(operations as any, { session });
    }

    return this.getRestaurantFlags(restaurantId, session);
  }

  /**
   * Seeds the default flags for a given restaurant.
   */
  public async seedDefaultFlags(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    const flagsToInsert = DEFAULT_FLAGS.map((flag) => ({
      restaurantId,
      key: flag.key,
      description: flag.description,
      enabled: false, // Defaulting to false
    }));

    await FeatureFlag.insertMany(flagsToInsert, { session });
  }
}

export const featureFlagService = new FeatureFlagService();

