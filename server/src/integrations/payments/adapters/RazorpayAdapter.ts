import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentProvider, PaymentIntent, WebhookVerificationResult } from '../PaymentProvider';
import { Transaction } from '../../../models/Transaction';
import { RestaurantSettings } from '../../../models/RestaurantSettings';
import { Types } from 'mongoose';
import { decrypt } from '../../../utils/encryption';

class CustomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export class RazorpayAdapter implements PaymentProvider {
  private async getRazorpayInstance(restaurantId: string): Promise<any> {
    const settings = await RestaurantSettings.findOne({ restaurantId });
    if (!settings || !settings.paymentConfig?.razorpayConfig) {
      throw new CustomError('Razorpay is not configured for this restaurant', 400);
    }

    const { keyId, keySecret } = settings.paymentConfig.razorpayConfig;
    if (!keyId || !keySecret) {
      throw new CustomError('Razorpay credentials are incomplete for this restaurant', 400);
    }

    const decryptedSecret = decrypt(keySecret);
    return new Razorpay({
      key_id: keyId,
      key_secret: decryptedSecret,
    });
  }

  async createIntent(
    restaurantId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ): Promise<PaymentIntent> {
    const instance = await this.getRazorpayInstance(restaurantId);

    let order;
    try {
      order = await instance.orders.create({
        amount,
        currency,
        receipt: metadata?.orderId || `rcpt_${Date.now()}`,
        notes: metadata,
      });
    } catch (error: any) {
      console.error('Razorpay Intent Creation Error:', error);
      throw new CustomError(`Failed to create Razorpay payment intent: ${error.message || 'Unknown error'}`, 502);
    }

    const transaction = await Transaction.create({
      restaurantId: new Types.ObjectId(restaurantId),
      tableSessionId: metadata?.tableSessionId ? new Types.ObjectId(metadata.tableSessionId) : undefined,
      orderId: metadata?.orderId ? new Types.ObjectId(metadata.orderId) : undefined,
      provider: 'RAZORPAY',
      mode: metadata?.mode || 'POSTPAID',
      amount,
      currency,
      status: 'PENDING',
      providerReferenceId: order.id,
      metadata: metadata || {},
    });

    return {
      transactionId: transaction._id.toString(),
      providerReferenceId: order.id,
      status: 'PENDING',
      amount: transaction.amount,
      currency: transaction.currency,
    };
  }

  async capture(transactionId: string, _amount: number): Promise<boolean> {
    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.provider !== 'RAZORPAY') return false;
    return tx.status === 'CAPTURED';
  }

  async refund(_transactionId: string, _amount: number): Promise<boolean> {
    throw new CustomError('Refund not implemented for Razorpay in Phase 7', 501);
  }

  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity || !paymentEntity.order_id) {
      return { isValid: false, rawPayload: payload };
    }

    const razorpayOrderId = paymentEntity.order_id;

    const transaction = await Transaction.findOne({ providerReferenceId: razorpayOrderId, provider: 'RAZORPAY' });
    if (!transaction) {
      return { isValid: false, rawPayload: payload };
    }

    const settings = await RestaurantSettings.findOne({ restaurantId: transaction.restaurantId });
    const encryptedWebhookSecret = (settings?.paymentConfig?.razorpayConfig as any)?.webhookSecret;

    if (!encryptedWebhookSecret) {
      console.error(`Razorpay webhook received for restaurant ${transaction.restaurantId} but no webhook secret configured`);
      return { isValid: false, rawPayload: payload };
    }

    const webhookSecret = decrypt(encryptedWebhookSecret);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      return { isValid: false, rawPayload: payload };
    }

    let status: 'CAPTURED' | 'FAILED' | undefined;
    if (payload.event === 'payment.captured') {
      status = 'CAPTURED';
    } else if (payload.event === 'payment.failed') {
      status = 'FAILED';
    }

    return {
      isValid: true,
      transactionId: transaction._id.toString(),
      status,
      rawPayload: payload
    };
  }
}
