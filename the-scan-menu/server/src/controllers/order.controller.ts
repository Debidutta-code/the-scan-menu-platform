import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { DiningSession } from '../models/DiningSession';
import { Bill } from '../models/Bill';
import { orderService } from '../services/order.service';
import { diningSessionService } from '../services/diningSession.service';
import { billService } from '../services/bill.service';
import { analyticsService } from '../services/analytics.service';
import { posIntegrationService } from '../services/posIntegration.service';
import { customerService } from '../services/customer.service';
import { loyaltyService } from '../services/loyalty.service';
import { sendSuccess, sendError } from '../utils/response';
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
    this.getTableOrders = this.getTableOrders.bind(this);
    this.settleTableSession = this.settleTableSession.bind(this);
    this.closeTableSession = this.closeTableSession.bind(this);
    this.abandonTableSession = this.abandonTableSession.bind(this);
    this.reopenTableSession = this.reopenTableSession.bind(this);
    this.retryPosSync = this.retryPosSync.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
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
        .populate('diningSessionId', 'status sessionCode closedAt')
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

      // Build the base query — exclude cancelled and cleared orders
      const query: Record<string, any> = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        status: { $ne: 'CANCELLED' },
        isCleared: { $ne: true },
      };

      const orders = await Order.find(query)
        .sort({ createdAt: 1 })
        .populate([
          { path: 'tableId', select: 'displayName tableNumber' },
          { path: 'diningSessionId', select: 'status sessionCode closedAt' },
        ]);

      // Filter out any legacy or edge-case orders where dining session is already CLOSED
      const activeOrders = orders.filter((o: any) => {
        if (o.diningSessionId && o.diningSessionId.status === 'CLOSED') {
          return false;
        }
        return true;
      });

      sendSuccess(res, activeOrders, 'Active orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createCounterOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { items, customerNote, customerName, customerPhone, orderMode, tableId, diningSessionId, paymentStatus, paymentMethod, source } = req.body;

      const effectiveOrderMode = orderMode || 'COUNTER';
      const isPaid = (paymentStatus || (effectiveOrderMode === 'COUNTER' ? 'PAID' : 'PENDING')) === 'PAID';

      const order = await orderService.createOrder({
        restaurantId,
        tableId,
        diningSessionId,
        orderMode: effectiveOrderMode,
        items,
        customerNote,
        customerName,
        customerPhone,
        source: source || 'POS',
        paymentStatus: isPaid ? 'PAID' : 'PENDING',
        paymentMethod: paymentMethod || 'CASH',
        createdByName: (req.user as any)?.name || 'Staff',
      });

      // Background Customer Profile Sync & Loyalty Points Accrual
      if (customerPhone && order) {
        customerService
          .findOrCreateCustomer(restaurantId, customerPhone, customerName)
          .then(async (customer) => {
            if (customer) {
              await customerService.recordCustomerOrder(customer._id, order.total || 0);
              if (isPaid) {
                await loyaltyService.earnPoints(restaurantId, customer._id, order.total || 0, order._id);
              }
            }
          })
          .catch((err) => console.error('Failed to accrue customer loyalty:', err));
      }

      sendSuccess(res, order, 'Counter order created successfully', 201);
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async getOrderDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;

      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      })
        .populate('tableId', 'displayName tableNumber')
        .populate('diningSessionId', 'status sessionCode closedAt');

      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      sendSuccess(res, order, 'Order details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;
      const { status: nextStatus } = req.body;

      const userRole = (req as any).staffRole || (req.user?.role as any) || 'STAFF';
      const order = await orderService.updateOrderStatus(restaurantId, orderId, nextStatus as OrderStatus, userRole);

      sendSuccess(res, order, 'Order status updated successfully');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async updateItemStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId, itemIndex } = req.params;
      const { itemStatus } = req.body;

      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      const index = parseInt(itemIndex, 10);
      if (isNaN(index) || index < 0 || index >= order.items.length) {
        sendError(res, 'ITEM_NOT_FOUND', 'Specified item index is out of bounds', null, 404);
        return;
      }

      const currentItemStatus = order.items[index].itemStatus || 'PENDING';
      const validItemTransitions: Record<string, string[]> = {
        PENDING: ['PREPARING', 'READY', 'SERVED'],
        PREPARING: ['READY', 'SERVED'],
        READY: ['SERVED'],
        SERVED: [],
      };

      if (
        currentItemStatus !== itemStatus &&
        (!validItemTransitions[currentItemStatus] ||
          !validItemTransitions[currentItemStatus].includes(itemStatus))
      ) {
        sendError(
          res,
          'INVALID_STATUS_TRANSITION',
          `Cannot transition item from ${currentItemStatus} to ${itemStatus}`,
          null,
          400
        );
        return;
      }

      order.items[index].itemStatus = itemStatus;
      if (itemStatus === 'SERVED' && !order.items[index].servedAt) {
        order.items[index].servedAt = new Date();
      }
      await order.save();

      sendSuccess(res, order, 'Item status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;
      const { reason } = req.body;

      const order = await orderService.cancelOrder(restaurantId, orderId, req.user?.id, reason);
      sendSuccess(res, order, 'Order cancelled successfully');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async getTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;

      const session = await DiningSession.findOne({
        _id: new mongoose.Types.ObjectId(sessionId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      }).populate('tableId', 'displayName tableNumber');

      if (!session) {
        sendError(res, 'SESSION_NOT_FOUND', 'Dining session not found', null, 404);
        return;
      }

      const orders = await Order.find({
        diningSessionId: session._id,
        status: { $ne: 'CANCELLED' },
      }).sort({ roundNumber: 1, createdAt: 1 });

      const activeBill = await Bill.findOne({
        diningSessionId: session._id,
        status: { $in: ['PENDING', 'SETTLED'] },
      }).sort({ version: -1 });

      sendSuccess(res, { session, orders, bill: activeBill }, 'Table session retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTableOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;

      // 1. Find active dining session if any
      const activeSession = await DiningSession.findOne({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        tableId: new mongoose.Types.ObjectId(tableId),
        status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
      });

      let orders: any[] = [];
      if (activeSession) {
        orders = await Order.find({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          diningSessionId: activeSession._id,
          status: { $ne: 'CANCELLED' },
        }).sort({ createdAt: 1 });
      }

      // 2. If no active session or no session orders found, find all non-cancelled orders for this table today
      if (orders.length === 0) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        orders = await Order.find({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          tableId: new mongoose.Types.ObjectId(tableId),
          status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'] },
          createdAt: { $gte: startOfDay },
        }).sort({ createdAt: 1 });
      }

      sendSuccess(res, orders, 'Table orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async settleTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;
      const { payments, manualDiscountAmount, discountReason } = req.body;

      let bill: any = await Bill.findOne({ diningSessionId: new mongoose.Types.ObjectId(sessionId), status: 'PENDING' });
      if (!bill) {
        bill = await billService.requestOrGenerateBill(restaurantId, sessionId, req.user?.id, manualDiscountAmount, discountReason);
      }

      if (!bill) {
        sendError(res, 'BILL_GENERATION_FAILED', 'Could not find or generate a bill for this session', null, 400);
        return;
      }

      const paymentList = Array.isArray(payments) && payments.length > 0
        ? payments
        : [{ method: 'CASH', amount: bill.balanceDue }];

      const result = await billService.settleBill(restaurantId, bill._id, paymentList, req.user?.id);
      sendSuccess(res, result, 'Session settled successfully');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async closeTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;

      const session = await diningSessionService.closeSession(restaurantId, sessionId, req.user?.id);
      sendSuccess(res, session, 'Dining session closed successfully');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async abandonTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        sendError(res, 'BAD_REQUEST', 'A reason is required when marking a session as abandoned', null, 400);
        return;
      }

      const session = await diningSessionService.abandonSession(restaurantId, sessionId, reason, req.user?.id);
      sendSuccess(res, session, 'Dining session marked as abandoned');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async retryPosSync(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;

      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!order) {
        sendError(res, 'ORDER_NOT_FOUND', 'Order not found', null, 404);
        return;
      }

      posIntegrationService.pushOrderAsync(new mongoose.Types.ObjectId(restaurantId), order);
      sendSuccess(res, { message: 'POS sync triggered' }, 'POS sync retry queued');
    } catch (error) {
      next(error);
    }
  }

  async reopenTableSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, sessionId } = req.params;

      const session = await billService.reopenSessionForOrdering(restaurantId, sessionId);
      sendSuccess(res, session, 'Session reopened for ordering');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async clearOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;

      const order = await orderService.clearOrder(restaurantId, orderId, req.user?.id);
      sendSuccess(res, order, 'Order cleared and table freed successfully');
    } catch (error: any) {
      if (error.code) {
        sendError(res, error.code, error.message, error.details, error.status);
      } else {
        next(error);
      }
    }
  }

  async updateOrderPaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, orderId } = req.params;
      const { paymentStatus } = req.body;

      if (!['PAID', 'PENDING'].includes(paymentStatus)) {
        sendError(res, 'BAD_REQUEST', 'Invalid payment status', null, 400);
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

      order.paymentStatus = paymentStatus;
      await order.save();

      sendSuccess(res, order, `Order payment marked as ${paymentStatus}`);
    } catch (error) {
      next(error);
    }
  }
}

export default OrderController;
