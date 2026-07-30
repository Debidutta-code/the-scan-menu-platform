import { PaymentProvider, PaymentIntent, WebhookVerificationResult } from '../PaymentProvider';
import { Transaction } from '../../../models/Transaction';
import { Types } from 'mongoose';

export class CashAdapter implements PaymentProvider {
  async createIntent(
    restaurantId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    // For Cash, we immediately record the transaction as CAPTURED
    const transaction = await Transaction.create({
      restaurantId: new Types.ObjectId(restaurantId),
      tableSessionId: metadata?.tableSessionId ? new Types.ObjectId(metadata.tableSessionId) : undefined,
      orderId: metadata?.orderId ? new Types.ObjectId(metadata.orderId) : undefined,
      provider: 'CASH',
      mode: metadata?.mode || 'POSTPAID',
      amount,
      currency,
      status: 'CAPTURED',
      metadata: metadata || {},
    });

    return {
      transactionId: transaction._id.toString(),
      status: 'CAPTURED',
      amount: transaction.amount,
      currency: transaction.currency,
    };
  }

  async capture(transactionId: string, _amount: number): Promise<boolean> {
    // Cash is captured immediately on intent creation.
    // If explicitly called, just verify the transaction exists and is captured.
    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.status !== 'CAPTURED') {
      return false;
    }
    return true;
  }

  async refund(transactionId: string, _amount: number): Promise<boolean> {
    // Implement manual refund ledger update later
    const tx = await Transaction.findById(transactionId);
    if (tx && tx.status === 'CAPTURED') {
      tx.status = 'REFUNDED';
      await tx.save();
      return true;
    }
    return false;
  }

  async verifyWebhook(_payload: any, _signature: string): Promise<WebhookVerificationResult> {
    // Cash does not have webhooks
    return { isValid: false };
  }
}
