import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { PaymentProviderFactory } from '../../src/integrations/payments/PaymentProviderFactory';
import { RazorpayAdapter } from '../../src/integrations/payments/adapters/RazorpayAdapter';
import { paymentService } from '../../src/services/payment.service';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Order } from '../../src/models/Order';
import { Transaction } from '../../src/models/Transaction';
import { auditLogService } from '../../src/services/auditLog.service';
import { NotificationService } from '../../src/services/notification.service';
import { encrypt } from '../../src/utils/encryption';

describe('Payment Configuration & Flow Architecture Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: 'supersecretkeythishasto-be-32byte' };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('PaymentProviderFactory should instantiate and return RazorpayAdapter for RAZORPAY', () => {
    const adapter = PaymentProviderFactory.getAdapter('RAZORPAY');
    expect(adapter).toBeInstanceOf(RazorpayAdapter);
  });

  it('PaymentService.verifyManualPayment should mark order as PAID and record staff audit details', async () => {
    const rId = new mongoose.Types.ObjectId();
    const oId = new mongoose.Types.ObjectId();

    const mockOrder: any = {
      _id: oId,
      restaurantId: rId,
      orderNumber: 101,
      total: 75000,
      paymentStatus: 'PENDING',
      status: 'PENDING',
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder as any);
    vi.spyOn(Transaction, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(Transaction.prototype, 'save').mockResolvedValue(true as any);
    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      workflow: { orderWorkflowMode: 'FIVE_STEP' },
    } as any);

    const logSpy = vi.spyOn(auditLogService, 'logEvent').mockResolvedValue(true as any);
    const notifySpy = vi.spyOn(NotificationService.getInstance(), 'notifyOrderStatusUpdated').mockImplementation(() => {});

    const result = await paymentService.verifyManualPayment(
      rId.toString(),
      oId.toString(),
      { id: 'staff_123', name: 'John Captain', role: 'STAFF' },
      'UPI',
      75000
    );

    expect(mockOrder.paymentStatus).toBe('PAID');
    expect(mockOrder.status).toBe('ACCEPTED');
    expect(result.transaction.status).toBe('CAPTURED');
    expect(result.transaction.metadata.verifiedByStaffId).toBe('staff_123');
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_MANUALLY_VERIFIED',
        actorId: 'staff_123',
      })
    );
  });

  it('RazorpayAdapter.verifyPaymentSignature should validate HMAC sha256 correctly', async () => {
    const rId = new mongoose.Types.ObjectId().toString();
    const keySecret = 'rzp_sec_abc123';
    const razorpayOrderId = 'order_98765';
    const razorpayPaymentId = 'pay_54321';

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      paymentConfig: {
        razorpayConfig: {
          keyId: 'rzp_live_test',
          keySecret: encrypt(keySecret),
        },
      },
    } as any);

    const expectedSig = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const adapter = new RazorpayAdapter();
    const isValid = await adapter.verifyPaymentSignature(
      rId,
      razorpayOrderId,
      razorpayPaymentId,
      expectedSig
    );

    expect(isValid).toBe(true);

    const isInvalid = await adapter.verifyPaymentSignature(
      rId,
      razorpayOrderId,
      razorpayPaymentId,
      'invalid_signature_xyz'
    );
    expect(isInvalid).toBe(false);
  });
});
