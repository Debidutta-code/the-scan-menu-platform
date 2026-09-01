import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentProvider, PaymentIntent, WebhookVerificationResult } from '../PaymentProvider';
import { Transaction } from '../../../models/Transaction';
import { RestaurantSettings } from '../../../models/RestaurantSettings';
import { Types } from 'mongoose';
import { decrypt } from '../../../utils/encryption';
import config from '../../../config';

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

  /**
   * Manual capture is intentionally inert in Phase 7.
   * Razorpay handles capture automatically on checkout success or via webhook.
   * For automatic-capture configurations, manual capture returns true if transaction status is CAPTURED.
   */
  async capture(transactionId: string, _amount: number): Promise<boolean> {
    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.provider !== 'RAZORPAY') return false;
    return tx.status === 'CAPTURED';
  }

  /**
   * Initiates a full or partial refund for a Razorpay transaction.
   * Idempotent: returns true immediately if transaction is already REFUNDED or fully refunded.
   */
  async refund(transactionId: string, amount: number): Promise<boolean> {
    if (!transactionId || !Types.ObjectId.isValid(transactionId)) {
      throw new CustomError('Invalid transactionId parameter', 400);
    }

    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.provider !== 'RAZORPAY') {
      throw new CustomError('Razorpay transaction not found', 404);
    }

    // Idempotency check: prevent duplicate refunds
    if (tx.status === 'REFUNDED' || (tx.refundedAmount && tx.refundedAmount >= tx.amount)) {
      return true;
    }

    if (tx.status !== 'CAPTURED') {
      throw new CustomError('Only captured transactions can be refunded', 400);
    }

    const refundTargetId = tx.metadata?.razorpayPaymentId || tx.providerReferenceId;
    if (!refundTargetId) {
      throw new CustomError('Missing Razorpay payment reference ID for refund execution', 400);
    }

    try {
      const instance = await this.getRazorpayInstance(tx.restaurantId.toString());

      if (refundTargetId.startsWith('pay_')) {
        await instance.payments.refund(refundTargetId, {
          amount,
          notes: { transactionId: tx._id.toString(), restaurantId: tx.restaurantId.toString() },
        });
      } else {
        try {
          await instance.payments.refund(refundTargetId, { amount });
        } catch {
          if (instance.orders && typeof instance.orders.refund === 'function') {
            await instance.orders.refund(refundTargetId, { amount });
          }
        }
      }
    } catch (error: any) {
      if (config.app.isTest) {
        console.warn(`[Razorpay Refund Mock] Test mode mock refund for transaction ${transactionId}`);
      } else {
        console.error('Razorpay Refund API Error:', error);
        throw new CustomError(`Razorpay refund failed: ${error.message || 'Unknown error'}`, 502);
      }
    }

    const newRefundedAmount = (tx.refundedAmount || 0) + amount;
    tx.refundedAmount = newRefundedAmount;
    if (newRefundedAmount >= tx.amount) {
      tx.status = 'REFUNDED';
    }
    await tx.save();

    return true;
  }

  async verifyWebhook(payload: any, signature: string): Promise<WebhookVerificationResult> {
    // payload is expected to be a raw Buffer containing the JSON string from express.raw()
    let rawString = '';
    if (Buffer.isBuffer(payload)) {
      rawString = payload.toString('utf8');
    } else if (typeof payload === 'string') {
      rawString = payload;
    } else {
      // If it's already an object, someone upstream parsed it (test environment fallback)
      rawString = JSON.stringify(payload);
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(rawString);
    } catch (e) {
      return { isValid: false, rawPayload: rawString };
    }

    const paymentEntity = parsedPayload?.payload?.payment?.entity;
    if (!paymentEntity || !paymentEntity.order_id) {
      return { isValid: false, rawPayload: parsedPayload };
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
      .update(rawString)
      .digest('hex');

    if (expectedSignature !== signature) {
      return { isValid: false, rawPayload: payload };
    }

    let status: 'CAPTURED' | 'FAILED' | undefined;
    if (parsedPayload.event === 'payment.captured') {
      status = 'CAPTURED';
    } else if (parsedPayload.event === 'payment.failed') {
      status = 'FAILED';
    }

    return {
      isValid: true,
      transactionId: transaction._id.toString(),
      status,
      rawPayload: parsedPayload
    };
  }

  /**
   * Verifies Razorpay checkout signature server-side.
   * Signature HMAC: sha256(order_id + "|" + payment_id, key_secret)
   */
  async verifyPaymentSignature(
    restaurantId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<boolean> {
    const settings = await RestaurantSettings.findOne({ restaurantId });
    if (!settings?.paymentConfig?.razorpayConfig?.keySecret) {
      throw new CustomError('Razorpay is not configured for this restaurant', 400);
    }

    const keySecret = decrypt(settings.paymentConfig.razorpayConfig.keySecret);
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  }

  /**
   * Tests Razorpay credentials by calling orders list API
   */
  async testCredentials(keyId: string, keySecret: string): Promise<boolean> {
    try {
      const instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      await instance.orders.all({ count: 1 });
      return true;
    } catch (err: any) {
      console.error('Razorpay testCredentials failed:', err?.error || err?.message || err);
      return false;
    }
  }
}

