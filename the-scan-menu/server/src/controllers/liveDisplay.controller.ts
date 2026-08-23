import { Request, Response, NextFunction } from 'express';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Order } from '../models/Order';
import { FeatureFlag } from '../models/FeatureFlag';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class LiveDisplayController {
  /**
   * GET /api/v1/public/restaurants/:slugOrId/live-display
   * Returns sanitized live queue data for customer-facing TV screens (ZERO PII).
   */
  async getDisplayData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slugOrId } = req.params;
      if (!slugOrId) {
        sendError(res, 'BAD_REQUEST', 'Restaurant identifier is required', null, 400);
        return;
      }

      const isObjectId = mongoose.Types.ObjectId.isValid(slugOrId);
      const query = isObjectId
        ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] }
        : { slug: slugOrId };

      const restaurant = await Restaurant.findOne({
        ...query,
        status: { $ne: 'ARCHIVED' },
      }).lean();

      if (!restaurant) {
        sendError(res, 'NOT_FOUND', 'Restaurant not found', null, 404);
        return;
      }

      // Check customer_display feature flag
      const displayFlag = await FeatureFlag.findOne({
        restaurantId: restaurant._id,
        key: 'customer_display',
      }).lean();

      if (displayFlag && !displayFlag.enabled) {
        sendError(res, 'FEATURE_DISABLED', 'Customer Live Display module is disabled for this restaurant', null, 403);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id }).lean();

      // Fetch active preparing and ready orders from the last 48 hours
      const activeCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const activeOrders = await Order.find({
        restaurantId: restaurant._id,
        status: { $in: ['PREPARING', 'READY'] },
        createdAt: { $gte: activeCutoff },
      })
        .populate('tableId', 'name tableNumber')
        .sort({ updatedAt: -1 })
        .lean();

      // Sanitise orders: strictly ZERO PII
      const sanitizedOrders = activeOrders.map((order: any) => {
        const rawNum = order.orderNumber || order._id.toString().slice(-4).toUpperCase();
        const orderNum = String(rawNum).startsWith('#') ? String(rawNum).slice(1) : String(rawNum);
        const tableName = order.tableId ? (order.tableId.name || `Table ${order.tableId.tableNumber}`) : null;

        return {
          id: order._id.toString(),
          orderNumber: orderNum,
          displayToken: `#${orderNum}`,
          orderType: order.orderType || 'DINE_IN',
          tableName: tableName,
          status: order.status,
          itemCount: Array.isArray(order.items)
            ? order.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)
            : 1,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      });

      const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

      sendSuccess(
        res,
        {
          restaurant: {
            id: restaurant._id.toString(),
            name: restaurant.name,
            slug: restaurant.slug,
            logoUrl: (settings as any)?.branding?.logoUrl || (restaurant as any).logoUrl || null,
            bannerUrl: (settings as any)?.branding?.bannerUrl || null,
            currency: (settings as any)?.currency || (restaurant as any).currency || 'INR',
            orderWorkflowMode: workflowMode,
          },
          orders: sanitizedOrders,
        },
        'Live display data retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  }
}

export const liveDisplayController = new LiveDisplayController();
