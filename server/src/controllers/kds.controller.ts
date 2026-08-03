import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { TableSession } from '../models/TableSession';
import { Category } from '../models/Category';
import { sendSuccess, sendError } from '../utils/response';
import { NotificationService } from '../services/notification.service';
import { posIntegrationService } from '../services/posIntegration.service';
import mongoose from 'mongoose';

export class KDSController {
  constructor() {
    this.getActiveTickets = this.getActiveTickets.bind(this);
    this.updateItemStatus = this.updateItemStatus.bind(this);
    this.bumpTicket = this.bumpTicket.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/kds/tickets
   * Retrieves active kitchen tickets for KDS view.
   * Accessible by MANAGER, STAFF, SUPER_ADMIN.
   * Guarded by 'kds' feature flag.
   */
  async getActiveTickets(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { category, orderMode } = req.query;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'BAD_REQUEST', 'Invalid restaurant ID format', null, 400);
        return;
      }

      const rId = new mongoose.Types.ObjectId(restaurantId);

      // Active orders query: orders not CANCELLED and not SERVED, or orders with items still needing prep
      const query: any = {
        restaurantId: rId,
        status: { $nin: ['SERVED', 'CANCELLED'] },
      };

      if (orderMode && typeof orderMode === 'string') {
        query.orderMode = orderMode.toUpperCase();
      }

      const orders = await Order.find(query)
        .populate('tableId', 'displayName tableNumber')
        .sort({ createdAt: 1 });

      // If category filter is supplied, filter items by category ID or name
      let filteredTickets = orders;
      if (category && typeof category === 'string' && category.trim() !== '') {
        const categoryFilter = category.trim();
        let targetCategoryIds: string[] = [];

        if (mongoose.Types.ObjectId.isValid(categoryFilter)) {
          targetCategoryIds.push(categoryFilter);
        } else {
          const matchedCategories = await Category.find({
            restaurantId: rId,
            name: { $regex: new RegExp(categoryFilter, 'i') },
          });
          targetCategoryIds = matchedCategories.map((c) => c._id.toString());
        }

        if (targetCategoryIds.length > 0) {
          filteredTickets = orders.map((order) => {
            const doc = order.toObject();
            doc.items = (doc.items || []).filter((item: any) =>
              item.menuItemId ? targetCategoryIds.includes(item.menuItemId.toString()) : true
            );
            return doc;
          }).filter((order: any) => order.items && order.items.length > 0) as any;
        }
      }

      sendSuccess(res, filteredTickets, 'Active KDS kitchen tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/restaurants/:restaurantId/kds/tickets/:orderId/items/:itemIndex/status
   * Advance item-level status on a ticket.
   */
  async updateItemStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId, itemIndex: itemIndexStr } = req.params;
      const { itemStatus: nextItemStatus } = req.body;

      const itemIndex = parseInt(itemIndexStr, 10);

      if (isNaN(itemIndex) || !nextItemStatus) {
        sendError(res, 'BAD_REQUEST', 'Item index and itemStatus are required', null, 400);
        return;
      }

      if (!['PENDING', 'PREPARING', 'READY', 'SERVED'].includes(nextItemStatus)) {
        sendError(res, 'BAD_REQUEST', 'Invalid itemStatus value', null, 400);
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      if (itemIndex < 0 || itemIndex >= order.items.length) {
        sendError(res, 'BAD_REQUEST', 'Invalid item index', null, 400);
        return;
      }

      const item = order.items[itemIndex];
      const currentItemStatus = item.itemStatus || 'PENDING';

      // Forward-only status validation (PENDING -> PREPARING -> READY -> SERVED)
      const statusSeverity: Record<string, number> = { PENDING: 0, PREPARING: 1, READY: 2, SERVED: 3 };
      if (statusSeverity[nextItemStatus] < statusSeverity[currentItemStatus]) {
        sendError(res, 'BAD_REQUEST', `Cannot change item status backwards from ${currentItemStatus} to ${nextItemStatus}`, null, 400);
        return;
      }

      item.itemStatus = nextItemStatus as any;
      if (nextItemStatus === 'SERVED') {
        item.servedAt = new Date();
      }

      const previousAggregateStatus = order.status;

      // Triggers pre-save hook for aggregate order status calculation
      await order.save();

      // Socket notification for item status update
      try {
        NotificationService.getInstance().notifyItemStatusUpdated(
          order.restaurantId.toString(),
          order._id.toString(),
          itemIndex,
          nextItemStatus,
          order.updatedAt
        );
      } catch (err) {
        console.error('Failed to notify item status update:', err);
      }

      // If aggregate order status changed, notify sockets and relay to POS
      if (order.status !== previousAggregateStatus) {
        try {
          NotificationService.getInstance().notifyOrderStatusUpdated(
            order.restaurantId.toString(),
            order._id.toString(),
            order.status,
            order.updatedAt
          );
        } catch (err) {
          console.error('Failed to notify order status update from KDS:', err);
        }

        // Relay status change non-blockingly to POS (Petpooja)
        posIntegrationService.updateOrderStatusAsync(restaurantId, orderId, order.status);
      }

      // Notify session update if session exists
      if (order.sessionId) {
        try {
          const session = await TableSession.findById(order.sessionId);
          if (session) {
            NotificationService.getInstance().notifySessionUpdated(
              order.restaurantId.toString(),
              session._id.toString(),
              session
            );
          }
        } catch (err) {
          console.error('Failed to notify session update from KDS:', err);
        }
      }

      sendSuccess(res, order, `Item status updated to ${nextItemStatus}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/kds/tickets/:orderId/bump
   * Resolves/bumps an entire kitchen ticket by marking all items SERVED.
   */
  async bumpTicket(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const now = new Date();
      for (const item of order.items) {
        item.itemStatus = 'SERVED';
        if (!item.servedAt) {
          item.servedAt = now;
        }
      }

      order.status = 'SERVED';
      await order.save();

      // Emit socket notification
      try {
        NotificationService.getInstance().notifyOrderStatusUpdated(
          order.restaurantId.toString(),
          order._id.toString(),
          'SERVED',
          order.updatedAt
        );
      } catch (err) {
        console.error('Failed to notify order status bump:', err);
      }

      // Relay to POS non-blockingly
      posIntegrationService.updateOrderStatusAsync(restaurantId, orderId, 'SERVED');

      sendSuccess(res, order, 'Kitchen ticket bumped and marked SERVED successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const kdsController = new KDSController();
export default kdsController;
