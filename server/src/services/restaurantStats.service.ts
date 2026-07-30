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
    let stats = await RestaurantStats.findOne({ restaurantId }).session(session || null);
    if (!stats) {
      const [newStats] = await RestaurantStats.create(
        [{ restaurantId }],
        { session }
      );
      stats = newStats;
    }
    return stats;
  }

  /**
   * Increments or decrements menuItemsCount explicitly.
   */
  async incrementMenuItems(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      { $inc: { menuItemsCount: delta } },
      { new: true, session }
    );
  }

  /**
   * Increments or decrements tablesCount explicitly.
   */
  async incrementTables(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      { $inc: { tablesCount: delta } },
      { new: true, session }
    );
  }

  /**
   * Increments or decrements staffCount explicitly.
   */
  async incrementStaff(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      { $inc: { staffCount: delta } },
      { new: true, session }
    );
  }

  /**
   * Records a new order created (increments ordersCount and activeOrders, todayOrders).
   */
  async recordOrderCreated(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return await RestaurantStats.findOneAndUpdate(
      { restaurantId },
      { $inc: { ordersCount: 1, activeOrders: 1, todayOrders: 1 } },
      { new: true, session }
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
    const revenue = completedDocs.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrdersDocs = await Order.find({ restaurantId, createdAt: { $gte: startOfToday } });
    const todayOrders = todayOrdersDocs.length;
    const todayRevenue = todayOrdersDocs
      .filter((o) => o.status === 'SERVED')
      .reduce((acc, curr) => acc + (curr.total || 0), 0);

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
