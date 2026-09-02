import { Types, ClientSession } from 'mongoose';
import { RestaurantStats, IRestaurantStats } from '../models/RestaurantStats';

export class RestaurantStatsRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IRestaurantStats | null> {
    return RestaurantStats.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async create(dataOrId: Partial<IRestaurantStats> | string | Types.ObjectId, session?: ClientSession): Promise<IRestaurantStats> {
    const data = typeof dataOrId === 'object' && !(dataOrId instanceof Types.ObjectId)
      ? dataOrId
      : { restaurantId: new Types.ObjectId(dataOrId.toString()) };
    const stats = new RestaurantStats(data);
    return stats.save({ session });
  }

  async findOrCreate(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<IRestaurantStats> {
    const existing = await this.findByRestaurantId(restaurantId);
    if (existing) return existing;
    return this.create(restaurantId, session);
  }

  async increment(
    restaurantId: string | Types.ObjectId,
    field: keyof Pick<IRestaurantStats, 'menuItemsCount' | 'tablesCount' | 'staffCount' | 'ordersCount' | 'activeOrders' | 'completedOrders' | 'cancelledOrders'>,
    amount: number,
    session?: ClientSession
  ): Promise<IRestaurantStats | null> {
    return RestaurantStats.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $inc: { [field]: amount } },
      { new: true, upsert: true, session }
    );
  }

  async updateRevenue(
    restaurantId: string | Types.ObjectId,
    revenueIncrement: number,
    todayRevenueIncrement: number,
    session?: ClientSession
  ): Promise<IRestaurantStats | null> {
    return RestaurantStats.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $inc: { revenue: revenueIncrement, todayRevenue: todayRevenueIncrement, todayOrders: 1 } },
      { new: true, upsert: true, session }
    );
  }

  async resetTodayStats(restaurantId: string | Types.ObjectId): Promise<void> {
    await RestaurantStats.updateOne(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $set: { todayRevenue: 0, todayOrders: 0 } }
    );
  }

  async updateByRestaurantId(restaurantId: string | Types.ObjectId, data: Partial<IRestaurantStats>, session?: ClientSession): Promise<IRestaurantStats | null> {
    return RestaurantStats.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $set: data },
      { new: true, upsert: true, session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await RestaurantStats.deleteOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const restaurantStatsRepository = new RestaurantStatsRepository();
