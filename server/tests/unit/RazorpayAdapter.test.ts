import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RazorpayAdapter } from '../../src/integrations/payments/adapters/RazorpayAdapter';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Transaction } from '../../src/models/Transaction';
import crypto from 'crypto';
import { encrypt } from '../../src/utils/encryption';
import mongoose from 'mongoose';

// Ensure the module is mocked before importing
vi.mock('razorpay', () => {
  return {
    default: class MockRazorpay {
      orders = {
        create: vi.fn().mockResolvedValue({ id: 'order_mock123' })
      };
      constructor() {}
    }
  };
});

describe('RazorpayAdapter', () => {
  let adapter: RazorpayAdapter;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: 'supersecretkeythishasto-be-32byte' };
    adapter = new RazorpayAdapter();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create an intent successfully', async () => {
    const rId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      paymentConfig: {
        razorpayConfig: {
          keyId: 'test_key',
          keySecret: encrypt('test_secret')
        }
      }
    } as any);

    vi.spyOn(Transaction, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      amount: 500,
      currency: 'INR'
    } as any);

    const intent = await adapter.createIntent(rId, 500, 'INR');

    expect(intent.providerReferenceId).toBe('order_mock123');
    expect(intent.status).toBe('PENDING');
  });

  it('should fail if Razorpay is not configured', async () => {
    const rId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue(null as any);
    await expect(adapter.createIntent(rId, 500, 'INR')).rejects.toThrow('Razorpay is not configured for this restaurant');
  });

  it('should verify valid webhook signature', async () => {
    const rId = new mongoose.Types.ObjectId().toString();
    const webhookSecret = 'whsec_test123';

    vi.spyOn(Transaction, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      restaurantId: rId,
      providerReferenceId: 'order_test1'
    } as any);

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      paymentConfig: {
        razorpayConfig: {
          webhookSecret: encrypt(webhookSecret)
        }
      }
    } as any);

    const payloadObj = { event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_test1' } } } };
    const rawBody = Buffer.from(JSON.stringify(payloadObj));
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody.toString('utf8')).digest('hex');

    const result = await adapter.verifyWebhook(rawBody, signature);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('CAPTURED');
  });

  it('should reject invalid webhook signature', async () => {
    const rId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(Transaction, 'findOne').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      restaurantId: rId,
      providerReferenceId: 'order_test1'
    } as any);

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      paymentConfig: {
        razorpayConfig: {
          webhookSecret: encrypt('correct_secret')
        }
      }
    } as any);

    const payloadObj = { event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_test1' } } } };
    const rawBody = Buffer.from(JSON.stringify(payloadObj));

    const result = await adapter.verifyWebhook(rawBody, 'wrong_signature');
    expect(result.isValid).toBe(false);
  });
});
