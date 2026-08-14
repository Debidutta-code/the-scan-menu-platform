import { Order } from '../models/Order';
import { NotificationService } from './notification.service';
import { PaymentProviderFactory } from '../integrations/payments/PaymentProviderFactory';
import { Transaction, ITransaction } from '../models/Transaction';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { Types } from 'mongoose';
import { PaymentIntent } from '../integrations/payments/PaymentProvider';
class CustomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class PaymentService {
  async createIntent(
    restaurantId: string | Types.ObjectId,
    amount: number,
    currency: string = 'INR',
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    const settings = await RestaurantSettings.findOne({ restaurantId });
    if (!settings) {
      throw new CustomError('Restaurant settings not found', 404);
    }

    const providerName = settings.paymentConfig?.activeProvider || 'CASH';
    const mode = settings.paymentConfig?.activeMode || 'POSTPAID';

    const enhancedMetadata = {
      ...metadata,
      mode,
    };

    const adapter = PaymentProviderFactory.getAdapter(providerName);
    return await adapter.createIntent(restaurantId.toString(), amount, currency, enhancedMetadata);
  }

  async listTransactions(
    restaurantId: string | Types.ObjectId,
    filters: { status?: string; method?: string; search?: string; startDate?: string; endDate?: string } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: any[]; total: number; summary: { totalRevenue: number; capturedCount: number; pendingCount: number; failedCount: number } }> {
    const rId = new Types.ObjectId(restaurantId);
    const query: any = { restaurantId: rId };

    if (filters.status && filters.status !== 'ALL') {
      if (['SUCCESS', 'PAID', 'CAPTURED'].includes(filters.status.toUpperCase())) {
        query.status = 'CAPTURED';
      } else {
        query.status = filters.status.toUpperCase();
      }
    }

    if (filters.method && filters.method !== 'ALL') {
      const m = filters.method.toUpperCase();
      query.$or = [{ method: m }, { provider: m }];
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      const searchRegex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const orConditions: any[] = [
        { 'metadata.customerName': searchRegex },
        { 'metadata.customerPhone': searchRegex },
        { providerReferenceId: searchRegex },
      ];

      const numSearch = parseInt(term, 10);
      if (!isNaN(numSearch)) {
        orConditions.push({ 'metadata.orderNumber': numSearch });
      }

      if (Types.ObjectId.isValid(term)) {
        orConditions.push({ _id: new Types.ObjectId(term) });
        orConditions.push({ orderId: new Types.ObjectId(term) });
      }

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: orConditions }];
        delete query.$or;
      } else {
        query.$or = orConditions;
      }
    }

    const skip = (page - 1) * limit;

    const [transactions, total, summaryAgg] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .populate([
          {
            path: 'orderId',
            select: 'orderNumber orderMode customerName customerPhone items total subtotal tax status paymentStatus tableId createdAt',
            populate: { path: 'tableId', select: 'displayName tableNumber' }
          },
          {
            path: 'diningSessionId',
            select: 'sessionCode tableId status',
            populate: { path: 'tableId', select: 'displayName tableNumber' }
          },
          { path: 'billId', select: 'billNumber netAmount balanceDue discountAmount' }
        ])
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
      Transaction.aggregate([
        { $match: { restaurantId: rId } },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'CAPTURED'] }, '$amount', 0] }
            },
            capturedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'CAPTURED'] }, 1, 0] }
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const summary = summaryAgg[0] || {
      totalRevenue: 0,
      capturedCount: 0,
      pendingCount: 0,
      failedCount: 0,
    };

    return { transactions: transactions as any[], total, summary };
  }

  async getTransaction(restaurantId: string | Types.ObjectId, transactionId: string): Promise<ITransaction> {
    const transaction = await Transaction.findOne({ _id: transactionId, restaurantId })
      .populate([
        {
          path: 'orderId',
          select: 'orderNumber orderMode customerName customerPhone items total subtotal tax status paymentStatus tableId createdAt',
          populate: { path: 'tableId', select: 'displayName tableNumber' }
        },
        {
          path: 'diningSessionId',
          select: 'sessionCode tableId status',
          populate: { path: 'tableId', select: 'displayName tableNumber' }
        },
        { path: 'billId', select: 'billNumber netAmount balanceDue discountAmount' }
      ]);
    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
    }
    return transaction;
  }

  async captureTransaction(
    restaurantId: string | Types.ObjectId,
    transactionId: string,
    staffUserId?: string,
    method?: string
  ): Promise<ITransaction> {
    const transaction = await Transaction.findOne({ _id: transactionId, restaurantId });
    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
    }

    transaction.status = 'CAPTURED';
    if (method) {
      transaction.method = method as any;
      if (['UPI', 'CARD', 'CASH'].includes(method)) {
        transaction.provider = method as any;
      }
    }
    transaction.metadata = {
      ...(transaction.metadata || {}),
      capturedByStaffId: staffUserId,
      capturedAt: new Date(),
    };
    await transaction.save();

    if (transaction.orderId) {
      const order = await Order.findById(transaction.orderId);
      if (order && order.paymentStatus !== 'PAID') {
        order.paymentStatus = 'PAID';
        await order.save();
        try {
          NotificationService.getInstance().notifyOrderStatusUpdated(
            restaurantId.toString(),
            order._id.toString(),
            order.status,
            order.updatedAt
          );
        } catch (err) {
          console.error('Failed to notify order status updated:', err);
        }
      }
    }

    return transaction;
  }

  async handleRazorpayWebhook(payload: any, signature: string): Promise<any> {
    const adapter = PaymentProviderFactory.getAdapter('RAZORPAY');
    const result = await adapter.verifyWebhook(payload, signature);

    if (!result.isValid || !result.transactionId) {
      return result;
    }

    const transaction = await Transaction.findById(result.transactionId);
    if (!transaction) {
      console.error(`Webhook verified but transaction ${result.transactionId} not found.`);
      return result;
    }

    if (transaction.status === 'CAPTURED' || transaction.status === 'FAILED') {
      return result;
    }

    if (result.status === 'CAPTURED') {
      transaction.status = 'CAPTURED';
      await transaction.save();

      if (transaction.orderId) {
        const order = await Order.findById(transaction.orderId);
        if (order && order.paymentStatus !== 'PAID') {
          order.paymentStatus = 'PAID';

          const settings = await RestaurantSettings.findOne({ restaurantId: order.restaurantId });
          const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

          if (order.status === 'PENDING' && settings?.paymentConfig?.activeMode === 'PREPAID') {
              if (settings?.workflow?.autoAcceptConfig?.enabled) {
                  order.status = workflowMode === 'FIVE_STEP' ? 'ACCEPTED' : 'PREPARING';
              }
          }

          await order.save();

          try {
             NotificationService.getInstance().notifyOrderStatusUpdated(
               order.restaurantId.toString(),
               order._id.toString(),
               order.status,
               order.updatedAt
             );
          } catch(e) {
              console.error("Failed to broadcast order update after payment", e);
          }
        }
      }
    } else if (result.status === 'FAILED') {
      transaction.status = 'FAILED';
      await transaction.save();
    }

    return result;
  }
}

export const paymentService = new PaymentService();
