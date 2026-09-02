import { Types, ClientSession } from 'mongoose';
import { RestaurantSettings, IRestaurantSettings } from '../models/RestaurantSettings';

export class RestaurantSettingsRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IRestaurantSettings | null> {
    return RestaurantSettings.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async create(data: Partial<IRestaurantSettings>, session?: ClientSession): Promise<IRestaurantSettings> {
    const settings = new RestaurantSettings(data);
    return settings.save({ session });
  }

  async findOrCreate(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<IRestaurantSettings> {
    const existing = await this.findByRestaurantId(restaurantId);
    if (existing) return existing;
    return this.create({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, session);
  }

  async updateByRestaurantId(
    restaurantId: string | Types.ObjectId,
    data: Partial<IRestaurantSettings>,
    session?: ClientSession
  ): Promise<IRestaurantSettings | null> {
    return RestaurantSettings.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $set: data },
      { new: true, session }
    );
  }

  async save(settings: IRestaurantSettings, session?: ClientSession): Promise<IRestaurantSettings> {
    return settings.save({ session });
  }

  async find(query: Record<string, any> = {}): Promise<IRestaurantSettings[]> {
    return RestaurantSettings.find(query);
  }

  async findOneAndUpdate(
    query: Record<string, any>,
    update: Record<string, any>,
    options: Record<string, any> = { new: true }
  ): Promise<IRestaurantSettings | null> {
    return RestaurantSettings.findOneAndUpdate(query, update, options);
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await RestaurantSettings.deleteOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const restaurantSettingsRepository = new RestaurantSettingsRepository();
