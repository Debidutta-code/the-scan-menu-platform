import { Types, ClientSession } from 'mongoose';
import { RestaurantOnboarding, IRestaurantOnboarding } from '../models/RestaurantOnboarding';

export class RestaurantOnboardingRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IRestaurantOnboarding | null> {
    return RestaurantOnboarding.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async create(data: Partial<IRestaurantOnboarding>, session?: ClientSession): Promise<IRestaurantOnboarding> {
    const onboarding = new RestaurantOnboarding(data);
    return onboarding.save({ session });
  }

  async findOrCreate(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<IRestaurantOnboarding> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const onboarding = await RestaurantOnboarding.findOneAndUpdate(
      { restaurantId: rId },
      { $setOnInsert: { restaurantId: rId } },
      { upsert: true, new: true, session }
    );
    return onboarding!;
  }

  async updateByRestaurantId(
    restaurantId: string | Types.ObjectId,
    data: Partial<IRestaurantOnboarding>,
    session?: ClientSession
  ): Promise<IRestaurantOnboarding | null> {
    return RestaurantOnboarding.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $set: data },
      { new: true, upsert: true, session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await RestaurantOnboarding.deleteOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const restaurantOnboardingRepository = new RestaurantOnboardingRepository();
