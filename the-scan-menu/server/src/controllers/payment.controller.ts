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
      const { status, method, search, startDate, endDate, page, limit } = req.query;

      const filters = {
        status: status as string,
        method: method as string,
        search: search as string,
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

  async captureTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId, id } = req.params;
      const { method } = req.body;
      const staffUserId = (req as any).user?.id;
      const transaction = await paymentService.captureTransaction(restaurantId, id, staffUserId, method);
      res.status(200).json({ success: true, data: transaction, message: 'Transaction marked as captured' });
    } catch (error) {
      next(error);
    }
  }

  async exportTransactionsCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const { status, startDate, endDate } = req.query;

      const filters = {
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
      };

      // Fetch up to 10,000 rows for CSV export (no pagination)
      const result = await paymentService.listTransactions(restaurantId, filters, 1, 10000);
      const transactions: any[] = result.transactions || [];

      const header = ['ID', 'Provider', 'Mode', 'Amount (INR)', 'Currency', 'Status', 'Order ID', 'Created At'];
      const rows = transactions.map((t: any) => [
        t._id?.toString() || '',
        t.provider || '',
        t.mode || '',
        ((t.amount || 0) / 100).toFixed(2),
        t.currency || 'INR',
        t.status || '',
        t.orderId?.toString() || '',
        t.createdAt ? new Date(t.createdAt).toISOString() : '',
      ]);

      const csvLines = [header, ...rows].map((row) =>
        row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      );
      const csvContent = csvLines.join('\n');

      const filename = `transactions_${restaurantId}_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const settings = await RestaurantSettings.findOne({ restaurantId });
      if (!settings) {
        throw new CustomError('Settings not found', 404);
      }

      const p = settings.paymentConfig;
      const isRazorpayConfigured = Boolean(p?.razorpayConfig?.keyId && p?.razorpayConfig?.keySecret);

      const safeConfig = {
        activeProvider: p?.activeProvider || 'CASH',
        activeMode: p?.activeMode || 'POSTPAID',
        paymentMethods: p?.paymentMethods || {
          cash: true,
          card: true,
          upi: true,
          razorpay: false,
        },
        manualUpi: {
          enabled: p?.manualUpiEnabled ?? p?.paymentMethods?.upi ?? true,
          upiId: p?.upiId || '',
          displayName: p?.upiDisplayName || '',
        },
        razorpay: {
          enabled: p?.razorpayEnabled ?? p?.paymentMethods?.razorpay ?? false,
          status: isRazorpayConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
          keyId: p?.razorpayConfig?.keyId || '',
        },
        ordering: {
          prepaidEnabled: p?.prepaidEnabled ?? true,
          postpaidEnabled: p?.postpaidEnabled ?? true,
          activeMode: p?.activeMode || 'POSTPAID',
        },
        preferredMethodOrder: p?.preferredMethodOrder || ['UPI', 'CASH', 'CARD', 'RAZORPAY'],
      };

      res.status(200).json({ success: true, data: safeConfig });
    } catch (error) {
      next(error);
    }
  }

  async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const userRole = (req as any).user?.role;
      const { activeProvider, activeMode, paymentMethods, preferredMethodOrder, upiId, upiDisplayName } = req.body;

      const settings = await RestaurantSettings.findOne({ restaurantId });
      if (!settings) {
        throw new CustomError('Settings not found', 404);
      }

      if (activeMode) {
        const validModes = ['PREPAID', 'POSTPAID', 'HYBRID'];
        if (!validModes.includes(activeMode)) {
          throw new CustomError('Invalid activeMode', 400);
        }
        settings.paymentConfig.activeMode = activeMode;
      }

      if (activeProvider) {
        const validProviders = ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE'];
        if (!validProviders.includes(activeProvider)) {
          throw new CustomError('Invalid activeProvider', 400);
        }

        // If manager tries to set activeProvider to RAZORPAY, verify it is enabled by Super Admin
        if (activeProvider === 'RAZORPAY' && !settings.paymentConfig.razorpayEnabled && userRole !== 'SUPER_ADMIN') {
          throw new CustomError('Razorpay is not enabled for this restaurant by platform admin', 403);
        }
        settings.paymentConfig.activeProvider = activeProvider;
      }

      if (paymentMethods && typeof paymentMethods === 'object') {
        const superAdminRazorpayEnabled = settings.paymentConfig.razorpayEnabled ?? false;
        settings.paymentConfig.paymentMethods = {
          cash: paymentMethods.cash !== undefined ? Boolean(paymentMethods.cash) : settings.paymentConfig.paymentMethods.cash,
          card: paymentMethods.card !== undefined ? Boolean(paymentMethods.card) : settings.paymentConfig.paymentMethods.card,
          upi: paymentMethods.upi !== undefined ? Boolean(paymentMethods.upi) : settings.paymentConfig.paymentMethods.upi,
          razorpay: userRole === 'SUPER_ADMIN'
            ? (paymentMethods.razorpay !== undefined ? Boolean(paymentMethods.razorpay) : settings.paymentConfig.paymentMethods.razorpay)
            : (superAdminRazorpayEnabled && paymentMethods.razorpay ? true : false),
        };
      }

      if (upiId !== undefined) {
        settings.paymentConfig.upiId = String(upiId).trim();
      }
      if (upiDisplayName !== undefined) {
        settings.paymentConfig.upiDisplayName = String(upiDisplayName).trim();
      }
      if (preferredMethodOrder && Array.isArray(preferredMethodOrder)) {
        settings.paymentConfig.preferredMethodOrder = preferredMethodOrder;
      }

      // Security: Non-superadmins CANNOT pass or modify razorpayConfig
      if (userRole === 'SUPER_ADMIN' && req.body.razorpayConfig) {
        const { razorpayConfig } = req.body;
        if (!settings.paymentConfig.razorpayConfig) {
          settings.paymentConfig.razorpayConfig = {};
        }
        if (razorpayConfig.keyId !== undefined) {
          settings.paymentConfig.razorpayConfig.keyId = razorpayConfig.keyId;
        }
        if (razorpayConfig.keySecret !== undefined && razorpayConfig.keySecret.trim()) {
          settings.paymentConfig.razorpayConfig.keySecret = encrypt(razorpayConfig.keySecret);
        }
        if (razorpayConfig.webhookSecret !== undefined && razorpayConfig.webhookSecret.trim()) {
          (settings.paymentConfig.razorpayConfig as any).webhookSecret = encrypt(razorpayConfig.webhookSecret);
        }
      }

      await settings.save();

      const isRazorpayConfigured = Boolean(settings.paymentConfig.razorpayConfig?.keyId && settings.paymentConfig.razorpayConfig?.keySecret);
      const safeConfig = {
        activeProvider: settings.paymentConfig.activeProvider,
        activeMode: settings.paymentConfig.activeMode,
        paymentMethods: settings.paymentConfig.paymentMethods,
        manualUpi: {
          enabled: settings.paymentConfig.manualUpiEnabled ?? settings.paymentConfig.paymentMethods.upi,
          upiId: settings.paymentConfig.upiId || '',
          displayName: settings.paymentConfig.upiDisplayName || '',
        },
        razorpay: {
          enabled: settings.paymentConfig.razorpayEnabled ?? settings.paymentConfig.paymentMethods.razorpay,
          status: isRazorpayConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
          keyId: settings.paymentConfig.razorpayConfig?.keyId || '',
        },
        preferredMethodOrder: settings.paymentConfig.preferredMethodOrder,
      };

      res.status(200).json({ success: true, data: safeConfig });
    } catch (error) {
      next(error);
    }
  }

  async verifyManualPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId, orderId } = req.params;
      const { method, amount } = req.body;
      const user = (req as any).user || {};

      const result = await paymentService.verifyManualPayment(
        restaurantId,
        orderId,
        { id: user.id || user._id, name: user.name, role: user.role },
        method || 'UPI',
        amount
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Payment verified successfully via ${method || 'UPI'}`,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyRazorpayPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { restaurantId } = req.params;
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new CustomError('orderId, razorpayOrderId, razorpayPaymentId, and razorpaySignature are required', 400);
      }

      const result = await paymentService.verifyRazorpayPayment(
        restaurantId,
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Razorpay payment verified and order updated successfully',
      });
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

      // req.body is a Buffer here because of express.raw in index.ts
      const rawBody = req.body;
      const result = await paymentService.handleRazorpayWebhook(rawBody, signature);

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
