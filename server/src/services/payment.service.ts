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
    filters: { status?: string; startDate?: string; endDate?: string } = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    const query: any = { restaurantId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    return { transactions: transactions as unknown as ITransaction[], total };
  }

  async getTransaction(restaurantId: string | Types.ObjectId, transactionId: string): Promise<ITransaction> {
    const transaction = await Transaction.findOne({ _id: transactionId, restaurantId });
    if (!transaction) {
      throw new CustomError('Transaction not found', 404);
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
