import { Types, ClientSession } from 'mongoose';
import { FeatureFlag, IFeatureFlag } from '../models/FeatureFlag';

export class FeatureFlagRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IFeatureFlag[]> {
    return FeatureFlag.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async findActiveByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IFeatureFlag[]> {
    return FeatureFlag.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), enabled: true }).select('key enabled -_id').lean() as unknown as IFeatureFlag[];
  }

  async findByKeyAndRestaurant(key: string, restaurantId: string | Types.ObjectId): Promise<IFeatureFlag | null> {
    return FeatureFlag.findOne({
      key,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByKey(restaurantId: string | Types.ObjectId, key: string): Promise<IFeatureFlag | null> {
    return this.findByKeyAndRestaurant(key, restaurantId);
  }

  async isEnabled(restaurantId: string | Types.ObjectId, key: string): Promise<boolean> {
    const flag = await FeatureFlag.findOne({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      key,
      enabled: true,
    });
    return !!flag;
  }

  async isEnabledForAny(restaurantIds: (string | Types.ObjectId)[], key: string): Promise<boolean> {
    const flag = await FeatureFlag.findOne({
      restaurantId: { $in: restaurantIds.map(id => new Types.ObjectId(id.toString())) },
      key,
      enabled: true,
    });
    return !!flag;
  }

  async upsert(
    restaurantId: string | Types.ObjectId,
    key: string,
    enabled: boolean,
    description?: string,
    session?: ClientSession
  ): Promise<IFeatureFlag> {
    return FeatureFlag.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()), key },
      { enabled, ...(description !== undefined ? { description } : {}) },
      { new: true, upsert: true, session }
    ) as unknown as IFeatureFlag;
  }

  async deleteByKeyAndRestaurant(key: string, restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await FeatureFlag.deleteOne({
      key,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    }, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await FeatureFlag.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const featureFlagRepository = new FeatureFlagRepository();
