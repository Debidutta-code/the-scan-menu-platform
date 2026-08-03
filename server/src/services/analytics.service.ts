import { Types } from 'mongoose';
import { Order } from '../models/Order';
import { RestaurantSettings } from '../models/RestaurantSettings';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface MetricSummary {
  revenue: number;
  orderCount: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  averageOrderValue: number;
  avgFulfillmentTimeMinutes: number;
}

export interface AnalyticsSummaryResult {
  current: MetricSummary;
  prior: MetricSummary;
  modeBreakdown: Record<string, { count: number; revenue: number }>;
  sourceBreakdown: Record<string, { count: number; revenue: number }>;
}

export interface TopItemResult {
  menuItemId: string;
  name: string;
  quantitySold: number;
  totalRevenue: number;
  isAvailable: boolean;
  isArchived: boolean;
}

export interface PeakHoursResult {
  timezone: string;
  hourly: Array<{ hour: number; orderCount: number; revenue: number }>;
  daily: Array<{ dayOfWeek: number; dayName: string; orderCount: number; revenue: number }>;
}

export class AnalyticsService {
  /**
   * Calculate date boundary defaults if omitted (defaults to start and end of today)
   */
  private resolveDateRange(startDate?: Date, endDate?: Date): DateRange {
    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : new Date();
    if (!endDate) end.setHours(23, 59, 59, 999);

    return { startDate: start, endDate: end };
  }

  /**
   * Helper to aggregate summary metrics over a specific date window
   */
  private async computeWindowSummary(rId: Types.ObjectId, rangeStart: Date, rangeEnd: Date): Promise<MetricSummary> {
    const paidStats = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          paidOrderCount: { $sum: 1 },
        },
      },
    ]);

    const totalOrdersCount = await Order.countDocuments({
      restaurantId: rId,
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    });

    const cancelledCount = await Order.countDocuments({
      restaurantId: rId,
      status: 'CANCELLED',
      createdAt: { $gte: rangeStart, $lte: rangeEnd },
    });

    const fulfillment = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: 'SERVED',
          createdAt: { $gte: rangeStart, $lte: rangeEnd },
        },
      },
      { $project: { durationMs: { $subtract: ['$updatedAt', '$createdAt'] } } },
      { $group: { _id: null, avgFulfillmentMs: { $avg: '$durationMs' } } },
    ]);

    const revenue = paidStats[0]?.revenue || 0;
    const paidOrderCount = paidStats[0]?.paidOrderCount || 0;
    const averageOrderValue = paidOrderCount > 0 ? Math.round(revenue / paidOrderCount) : 0;
    const avgFulfillmentTimeMinutes = fulfillment[0]?.avgFulfillmentMs
      ? Math.round((fulfillment[0].avgFulfillmentMs / 60000) * 10) / 10
      : 0;

    return {
      revenue,
      orderCount: totalOrdersCount,
      paidOrderCount,
      cancelledOrderCount: cancelledCount,
      averageOrderValue,
      avgFulfillmentTimeMinutes,
    };
  }

  /**
   * Revenue, order count, AOV, and breakdown by mode/source for a date range
   */
  async getSummary(
    restaurantId: string | Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsSummaryResult> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const { startDate: start, endDate: end } = this.resolveDateRange(startDate, endDate);

    const durationMs = end.getTime() - start.getTime();
    const priorStart = new Date(start.getTime() - durationMs);
    const priorEnd = new Date(start.getTime() - 1);

    const current = await this.computeWindowSummary(rId, start, end);
    const prior = await this.computeWindowSummary(rId, priorStart, priorEnd);

    // Breakdown by ordering mode (DINE_IN, TAKEAWAY, DELIVERY, COUNTER)
    const modeAgg = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$orderMode',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]);

    const modeBreakdown: Record<string, { count: number; revenue: number }> = {
      DINE_IN: { count: 0, revenue: 0 },
      TAKEAWAY: { count: 0, revenue: 0 },
      DELIVERY: { count: 0, revenue: 0 },
      COUNTER: { count: 0, revenue: 0 },
    };
    modeAgg.forEach((m: any) => {
      if (m._id in modeBreakdown) {
        modeBreakdown[m._id] = { count: m.count, revenue: m.revenue };
      }
    });

    // Breakdown by source (QR, POS, API, MANUAL)
    const sourceAgg = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
    ]);

    const sourceBreakdown: Record<string, { count: number; revenue: number }> = {
      QR: { count: 0, revenue: 0 },
      POS: { count: 0, revenue: 0 },
      API: { count: 0, revenue: 0 },
      MANUAL: { count: 0, revenue: 0 },
    };
    sourceAgg.forEach((s: any) => {
      if (s._id in sourceBreakdown) {
        sourceBreakdown[s._id] = { count: s.count, revenue: s.revenue };
      }
    });

    return {
      current,
      prior,
      modeBreakdown,
      sourceBreakdown,
    };
  }

  /**
   * Best-selling items by quantity or revenue, joined with current MenuItem availability status
   */
  async getTopItems(
    restaurantId: string | Types.ObjectId,
    startDate?: Date,
    endDate?: Date,
    limit: number = 10,
    sortBy: 'quantity' | 'revenue' = 'quantity'
  ): Promise<TopItemResult[]> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const { startDate: start, endDate: end } = this.resolveDateRange(startDate, endDate);

    const sortStage: Record<string, 1 | -1> = sortBy === 'revenue' ? { totalRevenue: -1 } : { quantitySold: -1 };

    const topItems = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.nameSnapshot' },
          quantitySold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.unitPriceSnapshot', '$items.quantity'] } },
        },
      },
      { $sort: sortStage },
      { $limit: limit },
      {
        $lookup: {
          from: 'menu_items',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItemInfo',
        },
      },
      { $unwind: { path: '$menuItemInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          menuItemId: { $toString: '$_id' },
          name: 1,
          quantitySold: 1,
          totalRevenue: 1,
          isAvailable: { $ifNull: ['$menuItemInfo.isAvailable', false] },
          isArchived: { $ifNull: ['$menuItemInfo.isArchived', false] },
        },
      },
    ]);

    return topItems;
  }

  /**
   * Order volume by hour of day (0-23) and day of week (1-7) in restaurant local timezone
   */
  async getPeakHours(
    restaurantId: string | Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<PeakHoursResult> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const { startDate: start, endDate: end } = this.resolveDateRange(startDate, endDate);

    const settings = await RestaurantSettings.findOne({ restaurantId: rId });
    const tz = settings?.timezone || 'Asia/Kolkata';

    // Group by hour (0..23)
    const hourlyAgg = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $hour: { date: '$createdAt', timezone: tz } },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyMap: Record<number, { orderCount: number; revenue: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { orderCount: 0, revenue: 0 };
    }
    hourlyAgg.forEach((item: any) => {
      if (item._id !== null && item._id >= 0 && item._id < 24) {
        hourlyMap[item._id] = { orderCount: item.orderCount, revenue: item.revenue };
      }
    });

    const hourly = Object.entries(hourlyMap).map(([h, val]) => ({
      hour: Number(h),
      orderCount: val.orderCount,
      revenue: val.revenue,
    }));

    // Group by day of week (1=Sunday..7=Saturday in MongoDB)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyAgg = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: { date: '$createdAt', timezone: tz } },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyMap: Record<number, { orderCount: number; revenue: number }> = {};
    for (let d = 1; d <= 7; d++) {
      dailyMap[d] = { orderCount: 0, revenue: 0 };
    }
    dailyAgg.forEach((item: any) => {
      if (item._id !== null && item._id >= 1 && item._id <= 7) {
        dailyMap[item._id] = { orderCount: item.orderCount, revenue: item.revenue };
      }
    });

    const daily = Object.entries(dailyMap).map(([d, val]) => {
      const dayNum = Number(d);
      return {
        dayOfWeek: dayNum,
        dayName: dayNames[dayNum - 1] || `Day ${dayNum}`,
        orderCount: val.orderCount,
        revenue: val.revenue,
      };
    });

    return {
      timezone: tz,
      hourly,
      daily,
    };
  }

  /**
   * Combined overview payload supporting the Manager Dashboard UI
   */
  async getOverview(
    restaurantId: string | Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const rId = new Types.ObjectId(restaurantId.toString());
    const { startDate: start, endDate: end } = this.resolveDateRange(startDate, endDate);

    const summary = await this.getSummary(rId, start, end);
    const topItems = await this.getTopItems(rId, start, end, 10, 'quantity');
    const peakHours = await this.getPeakHours(rId, start, end);

    const durationMs = end.getTime() - start.getTime();
    const isSingleDay = durationMs <= 28 * 60 * 60 * 1000;
    const dateFormat = isSingleDay ? '%H:00' : '%Y-%m-%d';

    const settings = await RestaurantSettings.findOne({ restaurantId: rId });
    const tz = settings?.timezone || 'Asia/Kolkata';

    // Time series timeline for charts
    const timeSeriesData = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt', timezone: tz } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedTimeSeries = timeSeriesData.map((item: any) => ({
      label: item._id,
      revenue: item.revenue,
      orders: item.orders,
    }));

    // Status counts distribution
    const statusCounts = await Order.aggregate([
      { $match: { restaurantId: rId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap: Record<string, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      PREPARING: 0,
      READY: 0,
      SERVED: 0,
      CANCELLED: 0,
    };
    statusCounts.forEach((item: any) => {
      if (item._id in statusMap) {
        statusMap[item._id] = item.count;
      }
    });

    // Table Turnover breakdown
    const tableTurnoverRaw = await Order.aggregate([
      {
        $match: {
          restaurantId: rId,
          status: { $ne: 'CANCELLED' },
          paymentStatus: 'PAID',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$tableId',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $lookup: { from: 'tables', localField: '_id', foreignField: '_id', as: 'tableInfo' } },
      { $unwind: { path: '$tableInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          tableNumber: { $ifNull: ['$tableInfo.tableNumber', 'Unknown'] },
          displayName: { $ifNull: ['$tableInfo.displayName', 'Takeaway/Delivery/Counter'] },
          orderCount: 1,
          revenue: 1,
          averageOrderValue: {
            $cond: [
              { $gt: ['$orderCount', 0] },
              { $round: [{ $divide: ['$revenue', '$orderCount'] }] },
              0,
            ],
          },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // Raw orders payload for CSV download
    const rawOrders = await Order.find({ restaurantId: rId, createdAt: { $gte: start, $lte: end } })
      .sort({ createdAt: -1 })
      .populate('tableId', 'displayName tableNumber');

    const csvData = rawOrders.map((order: any) => ({
      orderNumber: order.orderNumber,
      tableName: (order.tableId as any)?.displayName || 'Takeaway/Delivery/Counter',
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      itemCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      total: order.total,
    }));

    return {
      summary: {
        current: summary.current,
        prior: summary.prior,
      },
      modeBreakdown: summary.modeBreakdown,
      sourceBreakdown: summary.sourceBreakdown,
      peakHours,
      charts: {
        timeSeries: formattedTimeSeries,
        topSellingItems: topItems.map((item) => ({
          name: item.name,
          quantity: item.quantitySold,
          revenue: item.totalRevenue,
          isAvailable: item.isAvailable,
          isArchived: item.isArchived,
        })),
        orderStatusDistribution: statusMap,
      },
      tablesTurnover: tableTurnoverRaw,
      rawOrdersForCsv: csvData,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
