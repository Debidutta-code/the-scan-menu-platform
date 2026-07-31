import { describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import request from 'supertest';
import webhookRoutes from '../../src/routes/webhook.routes';
import { paymentService } from '../../src/services/payment.service';
import mongoose from 'mongoose';

vi.mock('../../src/services/payment.service', () => {
  return {
    paymentService: {
      handleRazorpayWebhook: vi.fn(),
    },
  };
});

const app = express();
app.use(express.json());
app.set('trust proxy', 1);
app.use('/api/v1/webhooks', webhookRoutes);

describe('Razorpay Webhook Endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return 400 if signature is missing', async () => {
    const response = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .send({ event: 'payment.captured' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Missing signature');
  });

  it('should return 400 if signature is invalid', async () => {
    vi.mocked(paymentService.handleRazorpayWebhook).mockResolvedValue({ isValid: false });

    const response = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('x-razorpay-signature', 'wrong_sig')
      .send({ event: 'payment.captured' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid signature');
  });

  it('should return 200 on successful verification', async () => {
    vi.mocked(paymentService.handleRazorpayWebhook).mockResolvedValue({
      isValid: true,
      transactionId: new mongoose.Types.ObjectId().toString(),
      status: 'CAPTURED'
    });

    const response = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('x-razorpay-signature', 'valid_sig')
      .send({ event: 'payment.captured' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Webhook processed successfully');
  });

  it('should block IP after multiple failed attempts', async () => {
    vi.mocked(paymentService.handleRazorpayWebhook).mockResolvedValue({ isValid: false });

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', 'wrong_sig')
        .send({ event: 'payment.captured' });
    }

    const blockedResponse = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('x-razorpay-signature', 'wrong_sig')
      .send({ event: 'payment.captured' });

    expect(blockedResponse.status).toBe(403);
    expect(blockedResponse.body.message).toBe('Forbidden');
  });
});
