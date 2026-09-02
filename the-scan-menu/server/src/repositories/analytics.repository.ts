import { Types } from 'mongoose';
import { Order } from '../models/Order';

export class AnalyticsRepository {
  /**
   * Raw aggregation pipeline for order analytics.
   * All analytics queries use this single method so the aggregation
   * logic stays in one place and is easy to swap out during migration.
   */
  async aggregateOrders(pipeline: any[]): Promise<any[]> {
    return Order.aggregate(pipeline);
  }

  async countOrdersByStatus(restaurantId: string | Types.ObjectId, status: string, startDate?: Date, endDate?: Date): Promise<number> {
    const match: Record<string, any> = {
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      status,
    };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = startDate;
      if (endDate) match.createdAt.$lte = endDate;
    }
    const result = await Order.aggregate([
      { $match: match },
      { $count: 'count' },
    ]);
    return result[0]?.count ?? 0;
  }

  async getRevenueStats(
    restaurantId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<{ total: number; count: number }> {
    const result = await Order.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId.toString()),
          status: { $nin: ['CANCELLED'] },
          paymentStatus: 'PAID',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0] ?? { total: 0, count: 0 };
  }

  async getDailyRevenueSeries(
    restaurantId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; revenue: number; orders: number }[]> {
    return Order.aggregate([
      {
        $match: {
          restaurantId: new Types.ObjectId(restaurantId.toString()),
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', revenue: 1, orders: 1 } },
    ]);
  }
}

export const analyticsRepository = new AnalyticsRepository();
