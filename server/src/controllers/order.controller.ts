import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus, OrderCounter } from '../models/Order';
import { TableSession } from '../models/TableSession';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { MenuItem } from '../models/MenuItem';
import { Tax } from '../models/Tax';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { validateStatusTransition } from '../utils/orderStateMachine';
import { sendSuccess, sendError } from '../utils/response';
import { NotificationService } from '../services/notification.service';
import { posIntegrationService } from '../services/posIntegration.service';
import { inventoryService } from '../services/inventory.service';
import { analyticsService } from '../services/analytics.service';
import mongoose from 'mongoose';

export class OrderController {
  constructor() {
    this.listOrders = this.listOrders.bind(this);
    this.listActiveOrders = this.listActiveOrders.bind(this);
    this.createCounterOrder = this.createCounterOrder.bind(this);
    this.getOrderDetails = this.getOrderDetails.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.getAnalytics = this.getAnalytics.bind(this);
    this.updateItemStatus = this.updateItemStatus.bind(this);
    this.getTableSession = this.getTableSession.bind(this);
    this.closeTableSession = this.closeTableSession.bind(this);
  }

  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const start = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const end = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analyticsData = await analyticsService.getOverview(restaurantId, start, end);
      sendSuccess(res, analyticsData, 'Analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async listOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const statusFilter = req.query.status as string;
      const search = req.query.search as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query: Record<string, any> = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      };

      if (statusFilter && statusFilter !== 'ALL') {
        query.status = statusFilter;
      }

      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedSearch, 'i');
        const numSearch = parseInt(search);

        const orConditions: any[] = [
          { customerName: searchRegex },
          { customerPhone: searchRegex }
        ];

        if (!isNaN(numSearch)) {
           orConditions.push({ orderNumber: numSearch });
        }

        query.$or = orConditions;
      }

      const total = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .populate('tableId', 'displayName tableNumber')
        .skip(skip)
        .limit(limit);

      const responseData = {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };

      sendSuccess(res, responseData, 'Orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async listActiveOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const settings = await RestaurantSettings.findOne({ restaurantId });
      const isPrepaid = settings?.paymentConfig?.activeMode === 'PREPAID';
      const hasDigitalPayment = settings?.paymentConfig?.activeProvider && settings.paymentConfig.activeProvider !== 'CASH';

      // Active orders are defined as anything not SERVED and not CANCELLED
      const query: any = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: { $nin: ['SERVED', 'CANCELLED'] },
      };

      if (isPrepaid || hasDigitalPayment) {
        query.paymentStatus = { $ne: 'PENDING' };
      }

      const orders = await Order.find(query)
        .sort({ createdAt: 1 })
        .populate('tableId', 'displayName tableNumber'); // Oldest first for kitchen prep queues
      sendSuccess(res, orders, 'Active orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createCounterOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { items, customerNote, customerName, customerPhone, paymentStatus } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        sendError(res, 'BAD_REQUEST', 'Order items are required and must be a non-empty array', null, 400);
        return;
      }

      const validatedItems = [];
      for (const item of items) {
        if (!item.itemId) {
          sendError(res, 'BAD_REQUEST', 'Each order item must specify an itemId', null, 400);
          return;
        }

        const menuItem = await MenuItem.findById(item.itemId);
        if (!menuItem || menuItem.restaurantId.toString() !== restaurantId) {
          sendError(res, 'BAD_REQUEST', `Item ${item.itemId} not found`, null, 400);
          return;
        }

        if (!menuItem.isAvailable) {
          sendError(res, 'ITEMS_UNAVAILABLE', `Item ${menuItem.name} is currently unavailable`, null, 400);
          return;
        }

        let unitPriceSnapshot = menuItem.price;
        const selectedAddOns = [];

        if (item.selectedAddOns && Array.isArray(item.selectedAddOns)) {
          for (const selected of item.selectedAddOns) {
            const match = menuItem.addOns?.find((addon: any) => addon.name === selected.name);
            if (match) {
              unitPriceSnapshot += match.priceDelta;
              selectedAddOns.push({
                name: match.name,
                priceDelta: match.priceDelta,
              });
            }
          }
        }

        validatedItems.push({
          menuItemId: menuItem._id,
          nameSnapshot: menuItem.name,
          unitPriceSnapshot,
          quantity: item.quantity || 1,
          selectedAddOns,
          specialInstructions: item.specialInstructions || '',
          prepTimeMinutesSnapshot: menuItem.prepTimeMinutes,
          itemStatus: 'PENDING',
        });
      }

      const stockResult = await inventoryService.validateAndDecrementStock(
        restaurantId,
        validatedItems.map((vi) => ({
          itemId: vi.menuItemId.toString(),
          quantity: vi.quantity,
          name: vi.nameSnapshot,
        }))
      );

      if (!stockResult.success) {
        sendError(
          res,
          'ITEMS_UNAVAILABLE',
          'Some items in your order are currently unavailable.',
          stockResult.failedItems || [],
          400
        );
        return;
      }

      const subtotal = validatedItems.reduce((sum, item) => sum + item.unitPriceSnapshot * item.quantity, 0);
      const activeTaxes: any[] = await Tax.find({ restaurantId, isActive: true });

      let tax = 0;
      const taxBreakdown: any[] = [];
      const groups = activeTaxes.filter((t) => t.type === 'GROUP');
      const standardTaxes = activeTaxes.filter((t) => t.type === 'TAX');

      for (const group of groups) {
        const subTaxes = standardTaxes.filter((t) => t.groupId?.toString() === group._id.toString());
        if (subTaxes.length === 0) continue;

        let groupAmount = 0;
        let groupPercentage = 0;
        const subTaxesBreakdown = subTaxes.map((st) => {
          const amt = Math.round(subtotal * (st.percentage / 100));
          groupAmount += amt;
          groupPercentage += st.percentage;
          return { name: st.name, percentage: st.percentage, amount: amt };
        });

        tax += groupAmount;
        taxBreakdown.push({
          name: group.name,
          percentage: groupPercentage,
          amount: groupAmount,
          subTaxes: subTaxesBreakdown,
        });
      }

      const standaloneTaxes = standardTaxes.filter((t) => !t.groupId);
      for (const st of standaloneTaxes) {
        const amount = Math.round(subtotal * (st.percentage / 100));
        tax += amount;
        taxBreakdown.push({
          name: st.name,
          percentage: st.percentage,
          amount,
          subTaxes: [],
        });
      }

      const total = subtotal + tax;

      const counter = await OrderCounter.findOneAndUpdate(
        { restaurantId },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      const orderNumber = counter.seq;

      const order = new Order({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        orderMode: 'COUNTER',
        isMerged: false,
        orderNumber,
        items: validatedItems,
        subtotal,
        tax,
        taxBreakdown,
        total,
        customerNote: customerNote || '',
        status: 'PENDING',
        source: 'POS',
        customerName: customerName ? customerName.trim() : 'Walk-in Customer',
        customerPhone: customerPhone ? customerPhone.trim() : undefined,
        paymentStatus: paymentStatus || 'PAID',
        integrationMetadata: {},
      });

      await order.save();
      await restaurantStatsService.recordOrderCreated(restaurantId);

      posIntegrationService.pushOrderAsync(restaurantId, order);

      try {
        NotificationService.getInstance().notifyOrderCreated(restaurantId, order);
      } catch (err) {
        console.error('Failed to notify counter order creation:', err);
      }

      sendSuccess(res, order, 'Counter order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getOrderDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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

      sendSuccess(res, order, 'Order retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;
      const { status: nextStatus } = req.body;
      const user = req.user!;

      if (!nextStatus) {
        sendError(res, 'BAD_REQUEST', 'Status body parameter is required', null, 400);
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

      // Fetch restaurant's orderWorkflowMode from settings
      const settings = await RestaurantSettings.findOne({ restaurantId }).select('workflow');
      const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

      // Check transition validity using central state machine logic
      const validation = validateStatusTransition(
        order.status,
        nextStatus as OrderStatus,
        user.role as 'SUPER_ADMIN' | 'MANAGER' | 'STAFF',
        workflowMode
      );

      if (!validation.isValid) {
        if (validation.errorCode === 'FORBIDDEN') {
          sendError(res, 'FORBIDDEN', validation.errorMessage || 'Access denied.', null, 403);
        } else {
          sendError(res, 'INVALID_STATUS_TRANSITION', validation.errorMessage || 'Invalid transition.', null, 400);
        }
        return;
      }

      const prevStatus = order.status;
      order.status = nextStatus as OrderStatus;
      await order.save();

      posIntegrationService.updateOrderStatusAsync(restaurantId, orderId, nextStatus);

      // Update statistics explicitly on terminal status transitions
      if (nextStatus === 'SERVED' && prevStatus !== 'SERVED') {
        await restaurantStatsService.recordOrderCompleted(restaurantId, order.total);
      } else if (nextStatus === 'CANCELLED' && prevStatus !== 'CANCELLED') {
        await restaurantStatsService.recordOrderCancelled(restaurantId);
      }

      // Emit order:status_updated via central NotificationService
      try {
        NotificationService.getInstance().notifyOrderStatusUpdated(
          order.restaurantId.toString(),
          order._id.toString(),
          order.status,
          order.updatedAt
        );
      } catch (err) {
        console.error('Failed to notify order status update:', err);
      }

      sendSuccess(res, order, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;
      const user = req.user!;

      // STAFF is blocked from cancel
      if (user.role !== 'MANAGER' && user.role !== 'SUPER_ADMIN') {
        sendError(res, 'FORBIDDEN', 'Only managers can cancel orders', null, 403);
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

      // Fetch restaurant's orderWorkflowMode from RestaurantSettings
      const settings = await RestaurantSettings.findOne({ restaurantId });
      const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

      // Run status transition validator to check if cancelling from current state is allowed
      const validation = validateStatusTransition(order.status, 'CANCELLED', user.role, workflowMode);

      if (!validation.isValid) {
        sendError(res, 'INVALID_STATUS_TRANSITION', validation.errorMessage || 'Invalid transition.', null, 400);
        return;
      }

      order.status = 'CANCELLED';
      await order.save();

      // Emit order:status_updated via central NotificationService
      try {
        NotificationService.getInstance().notifyOrderStatusUpdated(
          order.restaurantId.toString(),
          order._id.toString(),
          order.status,
          order.updatedAt
        );
      } catch (err) {
        console.error('Failed to notify order status update on cancel:', err);
      }

      sendSuccess(res, order, 'Order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

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

      // Validate simple forward-only transitions (PENDING -> PREPARING -> READY -> SERVED), no skipping backwards.
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

      // This will trigger pre-save hook and save
      await order.save();

      // Emit item status updated via socket
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

      // If aggregate status changed as a result of item update, emit order:status_updated and relay to POS
      if (order.status !== previousAggregateStatus) {
        try {
          NotificationService.getInstance().notifyOrderStatusUpdated(
            order.restaurantId.toString(),
            order._id.toString(),
            order.status,
            order.updatedAt
          );
        } catch (err) {
          console.error('Failed to notify order status update from item status update:', err);
        }

        posIntegrationService.updateOrderStatusAsync(restaurantId, orderId, order.status);
      }

      // Also notify session updated (as totals / rounds progress)
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
          console.error('Failed to notify session update:', err);
        }
      }

      sendSuccess(res, order, 'Item status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const session = await TableSession.findOne({
        _id: new mongoose.Types.ObjectId(sessionId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!session) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const orders = await Order.find({ sessionId: session._id }).sort({ roundNumber: 1 });

      sendSuccess(res, { session, orders }, 'Session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async closeTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      const session = await TableSession.findOne({
        _id: new mongoose.Types.ObjectId(sessionId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!session) {
        sendError(res, 'SESSION_NOT_FOUND', 'Session not found', null, 404);
        return;
      }

      session.status = 'CLOSED';
      session.closedAt = new Date();
      await session.save();

      // Settle payment status on all orders inside the session to PAID
      await Order.updateMany(
        { sessionId: session._id },
        { $set: { paymentStatus: 'PAID' } }
      );

      // Notify session updated
      try {
        NotificationService.getInstance().notifySessionUpdated(
          session.restaurantId.toString(),
          session._id.toString(),
          session
        );
      } catch (err) {
        console.error('Failed to notify session update:', err);
      }

      sendSuccess(res, session, 'Table session closed and settled successfully');
    } catch (error) {
      next(error);
    }
  }
}
export default OrderController;
