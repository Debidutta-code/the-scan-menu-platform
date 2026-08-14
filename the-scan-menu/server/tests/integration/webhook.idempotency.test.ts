import { NotificationService } from '../../src/services/notification.service';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { paymentService } from '../../src/services/payment.service';
import { Transaction } from '../../src/models/Transaction';
import { Order } from '../../src/models/Order';
import { PaymentProviderFactory } from '../../src/integrations/payments/PaymentProviderFactory';

describe('Webhook Idempotency', () => {
  let mockVerify: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockVerify = vi.fn().mockResolvedValue({
      isValid: true,
      transactionId: new mongoose.Types.ObjectId().toString(),
      status: 'CAPTURED',
    });

    vi.spyOn(PaymentProviderFactory, 'getAdapter').mockReturnValue({
      verifyWebhook: mockVerify,
      createIntent: vi.fn(),
      capture: vi.fn(),
      refund: vi.fn()
    });
  });

  it('should process payment.captured only once on duplicate deliveries', async () => {
    const txId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();

    mockVerify.mockResolvedValue({
      isValid: true,
      transactionId: txId.toString(),
      status: 'CAPTURED',
    });

    // Mock initial transaction state
    const transactionDoc = {
      _id: txId,
      status: 'PENDING',
      orderId: orderId,
      save: vi.fn().mockResolvedValue(true)
    };

    const orderDoc = {
      _id: orderId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      restaurantId: new mongoose.Types.ObjectId(),
      updatedAt: new Date(),
      save: vi.fn().mockResolvedValue(true)
    };

    vi.spyOn(Transaction, 'findById').mockResolvedValue(transactionDoc as any);
    vi.spyOn(Order, 'findById').mockResolvedValue(orderDoc as any);
    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({ workflow: { orderWorkflowMode: 'FIVE_STEP' }, paymentConfig: { activeMode: 'PREPAID'} } as any);
    vi.spyOn(NotificationService.prototype, 'notifyOrderStatusUpdated').mockImplementation(() => {});

    // Call webhook first time
    await paymentService.handleRazorpayWebhook({}, 'sig');

    expect(transactionDoc.status).toBe('CAPTURED');
    expect(transactionDoc.save).toHaveBeenCalledTimes(1);
    expect(orderDoc.paymentStatus).toBe('PAID');
    expect(orderDoc.save).toHaveBeenCalledTimes(1);

    // Now call it again (simulating retry).
    // The webhook handler checks if transaction.status === 'CAPTURED' and bails out
    // But since we are mocking findById, let's update the mock to return the new state
    transactionDoc.status = 'CAPTURED';

    await paymentService.handleRazorpayWebhook({}, 'sig');

    // Ensure save counts did NOT increase
    expect(transactionDoc.save).toHaveBeenCalledTimes(1);
    expect(orderDoc.save).toHaveBeenCalledTimes(1);
  });
});
