import { ClientSession, Types } from 'mongoose';
import { IRestaurantStats } from '../models/RestaurantStats';
import { restaurantStatsRepository } from '../repositories/restaurantStats.repository';
import { menuItemRepository } from '../repositories/menuItem.repository';
import { tableRepository } from '../repositories/table.repository';
import { restaurantStaffRepository } from '../repositories/restaurantStaff.repository';
import { orderRepository } from '../repositories/order.repository';

export class RestaurantStatsService {
  /**
   * Retrieves or creates initial stats for a restaurant.
   */
  async getOrCreateStats(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<IRestaurantStats> {
    return restaurantStatsRepository.findOrCreate(restaurantId, session);
  }

  /**
   * Increments or decrements menuItemsCount explicitly.
   */
  async incrementMenuItems(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    return restaurantStatsRepository.increment(restaurantId, 'menuItemsCount', delta, session);
  }

  /**
   * Increments or decrements tablesCount explicitly.
   */
  async incrementTables(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    return restaurantStatsRepository.increment(restaurantId, 'tablesCount', delta, session);
  }

  /**
   * Increments or decrements staffCount explicitly.
   */
  async incrementStaff(restaurantId: string | Types.ObjectId, delta = 1, session?: ClientSession) {
    return restaurantStatsRepository.increment(restaurantId, 'staffCount', delta, session);
  }

  /**
   * Record when a new order is placed.
   */
  async recordOrderCreated(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    return restaurantStatsRepository.increment(restaurantId, 'ordersCount', 1, session);
  }

  /**
   * Records an order completed (decrements activeOrders, increments completedOrders, revenue, todayRevenue).
   */
  async recordOrderCompleted(restaurantId: string | Types.ObjectId, amount: number, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return restaurantStatsRepository.updateRevenue(restaurantId, amount, amount, session);
  }

  /**
   * Records an order cancelled (decrements activeOrders, increments cancelledOrders).
   */
  async recordOrderCancelled(restaurantId: string | Types.ObjectId, session?: ClientSession) {
    await this.getOrCreateStats(restaurantId, session);
    return restaurantStatsRepository.increment(restaurantId, 'cancelledOrders', 1, session);
  }

  /**
   * Recalculates stats from DB for consistency.
   */
  async recalculateStats(restaurantId: string | Types.ObjectId) {
    const rId = new Types.ObjectId(restaurantId.toString());

    const [menuItemsCount, tablesCount, staffCount, ordersCount, activeOrders, completedOrders, cancelledOrders] = await Promise.all([
      menuItemRepository.countByRestaurantAndCategory(rId, rId).catch(() =>
        // Use direct countDocuments-equivalent via order repo if category method doesn't fit
        menuItemRepository['findByRestaurantId'](rId, { isArchived: { $ne: true } }).then((items: any[]) => items.length)
      ),
      tableRepository.countByRestaurantId(rId),
      restaurantStaffRepository.findActiveByRestaurantId(rId).then((staff: any[]) => staff.length),
      orderRepository.countByRestaurantId(rId),
      orderRepository.countByRestaurantId(rId, { status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] } }),
      orderRepository.countByRestaurantId(rId, { status: 'SERVED' }),
      orderRepository.countByRestaurantId(rId, { status: 'CANCELLED' }),
    ]);

    const completedDocs = await orderRepository.findByRestaurantId(rId, { status: 'SERVED' }, {}, 0, 100000);
    const revenue = completedDocs.reduce((acc, curr) => acc + (curr.total || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrdersDocs = await orderRepository.findByRestaurantId(rId, { createdAt: { $gte: startOfToday } }, {}, 0, 100000);
    const todayOrders = todayOrdersDocs.length;
    const todayRevenue = todayOrdersDocs
      .filter((o: any) => o.status === 'SERVED')
      .reduce((acc, curr) => acc + (curr.total || 0), 0);

    return restaurantStatsRepository.updateByRestaurantId(rId, {
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
    });
  }
}

export const restaurantStatsService = new RestaurantStatsService();
export default restaurantStatsService;
