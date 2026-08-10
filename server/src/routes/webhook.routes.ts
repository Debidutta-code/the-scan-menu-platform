import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { petpoojaWebhookController } from '../controllers/petpoojaWebhook.controller';
import rateLimit from 'express-rate-limit';
import config from '../config';

const router = Router();

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: config.app.isTest ? 10000 : 300,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests.',
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/razorpay', webhookLimiter, paymentController.handleRazorpayWebhook);
router.post('/petpooja', webhookLimiter, petpoojaWebhookController.handleWebhook);

export default router;
