import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { encrypt } from '../utils/encryption';

class CustomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// In-memory tracker for consecutive invalid signature failures per IP
const invalidSignatureTracker: Record<string, { count: number; expiresAt: number }> = {};
const BLOCK_THRESHOLD = 10;
const BLOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export class PaymentController {
  async createIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const { amount, currency, metadata } = req.body;

      if (!amount || amount <= 0) {
        throw new CustomError('Invalid amount', 400);
      }

      const intent = await paymentService.createIntent(restaurantId, amount, currency, metadata);
      res.status(201).json({ success: true, data: intent });
    } catch (error) {
      next(error);
    }
  }

  async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const { status, startDate, endDate, page, limit } = req.query;

      const filters = {
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 20;

      const result = await paymentService.listTransactions(restaurantId, filters, pageNumber, limitNumber);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId, id } = req.params;
      const transaction = await paymentService.getTransaction(restaurantId, id);
      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const { activeProvider, activeMode, razorpayConfig } = req.body;

      if (!activeProvider || !activeMode) {
        throw new CustomError('activeProvider and activeMode are required', 400);
      }

      const validProviders = ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE'];
      const validModes = ['PREPAID', 'POSTPAID', 'HYBRID'];

      if (!validProviders.includes(activeProvider)) {
        throw new CustomError('Invalid activeProvider', 400);
      }
      if (!validModes.includes(activeMode)) {
        throw new CustomError('Invalid activeMode', 400);
      }

      const settings = await RestaurantSettings.findOne({ restaurantId });
      if (!settings) {
        throw new CustomError('Settings not found', 404);
      }

      settings.paymentConfig.activeProvider = activeProvider;
      settings.paymentConfig.activeMode = activeMode;

      if (razorpayConfig) {
        if (!settings.paymentConfig.razorpayConfig) {
          settings.paymentConfig.razorpayConfig = {};
        }

        if (razorpayConfig.keyId !== undefined) {
          settings.paymentConfig.razorpayConfig.keyId = razorpayConfig.keyId;
        }

        if (razorpayConfig.keySecret !== undefined) {
          settings.paymentConfig.razorpayConfig.keySecret = encrypt(razorpayConfig.keySecret);
        }

        if (razorpayConfig.webhookSecret !== undefined) {
          (settings.paymentConfig.razorpayConfig as any).webhookSecret = encrypt(razorpayConfig.webhookSecret);
        }
      }

      await settings.save();

      const safeConfig = {
        activeProvider: settings.paymentConfig.activeProvider,
        activeMode: settings.paymentConfig.activeMode,
        razorpayConfig: {
          keyId: settings.paymentConfig.razorpayConfig?.keyId,
        }
      };

      res.status(200).json({ success: true, data: safeConfig });
    } catch (error) {
      next(error);
    }
  }

  async handleRazorpayWebhook(req: Request, res: Response) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (invalidSignatureTracker[ip] && invalidSignatureTracker[ip].expiresAt < now) {
      delete invalidSignatureTracker[ip];
    }

    if (invalidSignatureTracker[ip] && invalidSignatureTracker[ip].count >= BLOCK_THRESHOLD) {
      console.warn(`Blocked webhook from IP ${ip} due to consecutive invalid signature failures.`);
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      if (!signature) {
        throw new CustomError('Missing signature', 400);
      }

      const result = await paymentService.handleRazorpayWebhook(req.body, signature);

      if (!result.isValid) {
        if (!invalidSignatureTracker[ip]) {
          invalidSignatureTracker[ip] = { count: 1, expiresAt: now + BLOCK_WINDOW_MS };
        } else {
          invalidSignatureTracker[ip].count += 1;
        }
        console.warn(`Invalid Razorpay webhook signature from IP ${ip}. Failures: ${invalidSignatureTracker[ip].count}`);
        res.status(400).json({ success: false, message: 'Invalid signature' });
        return;
      }

      delete invalidSignatureTracker[ip];

      res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Razorpay Webhook Error:', error);
      const status = error instanceof CustomError ? error.status : 500;
      res.status(status).json({ success: false, message: error instanceof CustomError ? error.message : 'Error processing webhook' });
    }
  }
}

export const paymentController = new PaymentController();
