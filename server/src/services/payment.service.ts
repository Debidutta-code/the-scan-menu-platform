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
}

export const paymentService = new PaymentService();
