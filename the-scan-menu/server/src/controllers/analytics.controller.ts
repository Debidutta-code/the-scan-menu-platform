import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { analyticsService } from '../services/analytics.service';
import { analyticsQuerySchema } from '../validators/analytics.validator';
import { sendSuccess, sendError } from '../utils/response';

export class AnalyticsController {
  constructor() {
    this.getSummary = this.getSummary.bind(this);
    this.getTopItems = this.getTopItems.bind(this);
    this.getPeakHours = this.getPeakHours.bind(this);
    this.getOverview = this.getOverview.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/analytics/summary
   * Revenue, total/paid/cancelled order counts, AOV, and mode/source breakdowns.
   */
  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = analyticsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        sendError(res, 'INVALID_DATE_RANGE', parseResult.error.errors[0]?.message || 'Invalid date range query', null, 400);
        return;
      }

      const { startDate, endDate } = parseResult.data;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (start && end && start > end) {
        sendError(res, 'INVALID_DATE_RANGE', 'startDate cannot be after endDate', null, 400);
        return;
      }

      const summary = await analyticsService.getSummary(restaurantId, start, end);
      sendSuccess(res, summary, 'Analytics summary retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/analytics/top-items
   * Best-selling menu items by quantity or revenue, joined with current availability badges.
   */
  async getTopItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = analyticsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        sendError(res, 'INVALID_QUERY', parseResult.error.errors[0]?.message || 'Invalid analytics query parameters', null, 400);
        return;
      }

      const { startDate, endDate, limit, sortBy } = parseResult.data;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (start && end && start > end) {
        sendError(res, 'INVALID_DATE_RANGE', 'startDate cannot be after endDate', null, 400);
        return;
      }

      const topItems = await analyticsService.getTopItems(restaurantId, start, end, limit || 10, sortBy || 'quantity');
      sendSuccess(res, topItems, 'Top selling menu items retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/analytics/peak-hours
   * Hourly and daily order volume distribution in restaurant local timezone.
   */
  async getPeakHours(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = analyticsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        sendError(res, 'INVALID_DATE_RANGE', parseResult.error.errors[0]?.message || 'Invalid date range query', null, 400);
        return;
      }

      const { startDate, endDate } = parseResult.data;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (start && end && start > end) {
        sendError(res, 'INVALID_DATE_RANGE', 'startDate cannot be after endDate', null, 400);
        return;
      }

      const peakHours = await analyticsService.getPeakHours(restaurantId, start, end);
      sendSuccess(res, peakHours, 'Peak hours analytics retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/analytics
   * Composite overview data for Manager Analytics Dashboard.
   */
  async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = analyticsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        sendError(res, 'INVALID_DATE_RANGE', parseResult.error.errors[0]?.message || 'Invalid date range query', null, 400);
        return;
      }

      const { startDate, endDate } = parseResult.data;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (start && end && start > end) {
        sendError(res, 'INVALID_DATE_RANGE', 'startDate cannot be after endDate', null, 400);
        return;
      }

      const overview = await analyticsService.getOverview(restaurantId, start, end);
      sendSuccess(res, overview, 'Analytics overview retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
export default analyticsController;
