import { Types, ClientSession } from 'mongoose';
import { ApiKey, IApiKey, ApiKeyScope } from '../models/ApiKey';

export class ApiKeyRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IApiKey[]> {
    return ApiKey.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) }).sort({ createdAt: -1 });
  }

  async findByKeyHash(keyHash: string): Promise<IApiKey | null> {
    return ApiKey.findOne({ keyHash });
  }

  async findById(id: string | Types.ObjectId): Promise<IApiKey | null> {
    return ApiKey.findById(id);
  }

  async create(data: Partial<IApiKey>, session?: ClientSession): Promise<IApiKey> {
    const key = new ApiKey(data);
    return key.save({ session });
  }

  async deleteByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<boolean> {
    const res = await ApiKey.deleteOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    }, { session });
    return res.deletedCount > 0;
  }

  async updateLastUsed(id: string | Types.ObjectId): Promise<void> {
    await ApiKey.updateOne({ _id: new Types.ObjectId(id.toString()) }, { $set: { lastUsedAt: new Date() } });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await ApiKey.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const apiKeyRepository = new ApiKeyRepository();
