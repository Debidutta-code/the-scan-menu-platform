import { ClientSession, Types } from 'mongoose';
import { RestaurantStats, IRestaurantStats } from '../models/RestaurantStats';
import { MenuItem } from '../models/MenuItem';
import { Table } from '../models/Table';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { Order } from '../models/Order';

export class RestaurantStatsService {
  /**
   * Retrieves or creates initial stats for a restaurant.
   */
  async getOrCreateStats(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<IRestaurantStats> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const stats = await RestaurantStats.findOneAndUpdate(
      { restaurantId: rId },
      { $setOnInsert: { restaurantId: rId } },
      { upsert: true, new: true, session }
    );
    return stats!;
  }

  /**
   * Increments or decrements menuItemsCount explicitly.
   */
  async incrementMenuItems(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    const rId = new Types.ObjectId(restaurantId.toString());
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId: rId },
      { $inc: { menuItemsCount: delta } },
      { upsert: true, new: true, session }
    );
  }

  /**
   * Increments or decrements tablesCount explicitly.
   */
  async incrementTables(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    const rId = new Types.ObjectId(restaurantId.toString());
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId: rId },
      { $inc: { tablesCount: delta } },
      { upsert: true, new: true, session }
    );
  }

  /**
   * Increments or decrements staffCount explicitly.
   */
  async incrementStaff(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    const rId = new Types.ObjectId(restaurantId.toString());
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId: rId },
      { $inc: { staffCount: delta } },
      { upsert: true, new: true, session }
    );
  }

  /**
   * Record when a new order is placed.
   */
  async recordOrderCreated(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    const rId = new Types.ObjectId(restaurantId.toString());
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId: rId },
      { $inc: { totalOrdersCount: 1, activeOrdersCount: 1 } },
      { upsert: true, new: true, session }
    );
  }

  /**
   * Records an order completed (decrements activeOrders, increments completedOrders, revenue, todayRevenue).
   */
  async recordOrderCompleted(restaurantId: string | Types.ObjectId, amount: number, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      {
        $inc: {
          activeOrders: -1,
          completedOrders: 1,
          revenue: amount,
          todayRevenue: amount,
        },
      },
      { new: true, session }
    );
  }

  /**
   * Records an order cancelled (decrements activeOrders, increments cancelledOrders).
   */
  async recordOrderCancelled(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      {
        $inc: {
          activeOrders: -1,
          cancelledOrders: 1,
        },
      },
      { new: true, session }
    );
  }

  /**
   * Recalculates stats from DB for consistency.
   */
  async recalculateStats(restaurantId: string | Types.ObjectId) {
    const menuItemsCount = await MenuItem.countDocuments({ restaurantId, isArchived: { $ne: true } });
    const tablesCount = await Table.countDocuments({ restaurantId, isArchived: false });
    const staffCount = await RestaurantStaff.countDocuments({ restaurantId, isActive: true });
    const ordersCount = await Order.countDocuments({ restaurantId });
    const activeOrders = await Order.countDocuments({ restaurantId, status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] } });
    const completedOrders = await Order.countDocuments({ restaurantId, status: 'SERVED' });
    const cancelledOrders = await Order.countDocuments({ restaurantId, status: 'CANCELLED' });

    const completedDocs = await Order.find({ restaurantId, status: 'SERVED' }, 'total createdAt');
    const revenue = completedDocs.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrdersDocs = await Order.find({ restaurantId, createdAt: { $gte: startOfToday } });
    const todayOrders = todayOrdersDocs.length;
    const todayRevenue = todayOrdersDocs
      .filter((o: any) => o.status === 'SERVED')
      .reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);

    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      {
        $set: {
          menuItemsCount,
          tablesCount,
          staffCount,
          ordersCount,
          activeOrders,
          completedOrders,
          cancelledOrders,
          revenue,
          todayRevenue,
          todayOrders,
        },
      },
      { new: true, upsert: true }
    );
  }
}

export const restaurantStatsService = new RestaurantStatsService();
export default restaurantStatsService;
