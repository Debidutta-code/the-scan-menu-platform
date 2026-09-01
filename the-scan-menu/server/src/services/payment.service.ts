import { Order } from '../models/Order';
import { NotificationService } from './notification.service';
import { PaymentProviderFactory } from '../integrations/payments/PaymentProviderFactory';
import { RazorpayAdapter } from '../integrations/payments/adapters/RazorpayAdapter';
import { Transaction, ITransaction } from '../models/Transaction';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { auditLogService } from './auditLog.service';
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

  /**
   * Explicit Staff Verification for Manual UPI, Cash, or Card payments
   */
  async verifyManualPayment(
    restaurantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    staffUser: { id?: string; name?: string; role?: string },
    method: string = 'UPI',
    amount?: number
  ): Promise<{ order: any; transaction: any }> {
    const rId = new Types.ObjectId(restaurantId);
    const oId = new Types.ObjectId(orderId);

    const order = await Order.findOne({ _id: oId, restaurantId: rId });
    if (!order) {
      throw new CustomError('Order not found for this restaurant', 404);
    }

    const payableAmount = amount !== undefined ? amount : order.total;

    // Find or create transaction record
    let transaction = await Transaction.findOne({ orderId: oId, restaurantId: rId });
    if (!transaction) {
      transaction = new Transaction({
        restaurantId: rId,
        orderId: oId,
        diningSessionId: order.diningSessionId,
        tableSessionId: order.diningSessionId,
        provider: (['UPI', 'CASH', 'CARD'].includes(method.toUpperCase()) ? method.toUpperCase() : 'MANUAL') as any,
        method: (['UPI', 'CASH', 'CARD'].includes(method.toUpperCase()) ? method.toUpperCase() : 'OTHER') as any,
        mode: order.diningSessionId ? 'POSTPAID' : 'PREPAID',
        amount: payableAmount,
        currency: 'INR',
        status: 'CAPTURED',
        metadata: {
          verifiedByStaffId: staffUser.id,
          verifiedByStaffName: staffUser.name,
          verifiedAt: new Date(),
          isManualVerification: true,
          method,
        },
      });
    } else {
      transaction.status = 'CAPTURED';
      transaction.method = (['UPI', 'CASH', 'CARD'].includes(method.toUpperCase()) ? method.toUpperCase() : 'OTHER') as any;
      transaction.provider = (['UPI', 'CASH', 'CARD'].includes(method.toUpperCase()) ? method.toUpperCase() : 'MANUAL') as any;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        verifiedByStaffId: staffUser.id,
        verifiedByStaffName: staffUser.name,
        verifiedAt: new Date(),
        isManualVerification: true,
        method,
      };
    }
    await transaction.save();

    order.paymentStatus = 'PAID';
    order.paymentMethod = method;

    const settings = await RestaurantSettings.findOne({ restaurantId: rId });
    const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

    if (order.status === 'PENDING') {
      order.status = workflowMode === 'FIVE_STEP' ? 'ACCEPTED' : 'PREPARING';
    }

    await order.save();

    // Log to Audit Log
    try {
      await auditLogService.logEvent({
        action: 'PAYMENT_MANUALLY_VERIFIED',
        actorId: staffUser.id,
        actorName: staffUser.name,
        actorRole: staffUser.role,
        restaurantId: rId.toString(),
        severity: 'INFO',
        details: {
          orderId: oId.toString(),
          orderNumber: order.orderNumber,
          amount: payableAmount,
          method,
          transactionId: transaction._id.toString(),
        },
      });
    } catch (e) {
      console.error('Failed to write audit log for manual payment verification:', e);
    }

    try {
      NotificationService.getInstance().notifyOrderStatusUpdated(
        rId.toString(),
        order._id.toString(),
        order.status,
        order.updatedAt
      );
    } catch (err) {
      console.error('Failed to notify order status updated:', err);
    }

    return { order, transaction };
  }

  /**
   * Server-side verified Razorpay Payment confirmation
   */
  async verifyRazorpayPayment(
    restaurantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{ success: boolean; order: any; transaction: any }> {
    const rId = new Types.ObjectId(restaurantId);
    const oId = new Types.ObjectId(orderId);

    const adapter = new RazorpayAdapter();
    const isValid = await adapter.verifyPaymentSignature(
      restaurantId.toString(),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      throw new CustomError('Razorpay payment signature verification failed', 400);
    }

    const order = await Order.findOne({ _id: oId, restaurantId: rId });
    if (!order) {
      throw new CustomError('Order not found', 404);
    }

    let transaction = await Transaction.findOne({
      $or: [
        { providerReferenceId: razorpayOrderId },
        { orderId: oId }
      ],
      restaurantId: rId,
    });

    if (!transaction) {
      transaction = new Transaction({
        restaurantId: rId,
        orderId: oId,
        diningSessionId: order.diningSessionId,
        provider: 'RAZORPAY',
        method: 'UPI',
        mode: order.diningSessionId ? 'POSTPAID' : 'PREPAID',
        amount: order.total,
        currency: 'INR',
        status: 'CAPTURED',
        providerReferenceId: razorpayOrderId,
        metadata: {
          razorpayPaymentId,
          razorpaySignature,
          verifiedAt: new Date(),
        },
      });
    } else {
      transaction.status = 'CAPTURED';
      transaction.providerReferenceId = razorpayOrderId;
      transaction.metadata = {
        ...(transaction.metadata || {}),
        razorpayPaymentId,
        razorpaySignature,
        verifiedAt: new Date(),
      };
    }
    await transaction.save();

    order.paymentStatus = 'PAID';
    order.paymentMethod = 'RAZORPAY';

    const settings = await RestaurantSettings.findOne({ restaurantId: rId });
    const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

    if (order.status === 'PENDING') {
      order.status = workflowMode === 'FIVE_STEP' ? 'ACCEPTED' : 'PREPARING';
    }

    await order.save();

    try {
      await auditLogService.logEvent({
        action: 'PAYMENT_RAZORPAY_VERIFIED',
        restaurantId: rId.toString(),
        severity: 'INFO',
        details: {
          orderId: oId.toString(),
          orderNumber: order.orderNumber,
          razorpayOrderId,
          razorpayPaymentId,
          amount: order.total,
        },
      });
    } catch (e) {
      console.error('Failed to write audit log for razorpay verification:', e);
    }

    try {
      NotificationService.getInstance().notifyOrderStatusUpdated(
        rId.toString(),
        order._id.toString(),
        order.status,
        order.updatedAt
      );
    } catch (err) {
      console.error('Failed to notify order status update:', err);
    }

    return { success: true, order, transaction };
  }
}

export const paymentService = new PaymentService();

