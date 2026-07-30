import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { RestaurantSettings } from '../models/RestaurantSettings';
class CustomError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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
      const { activeProvider, activeMode } = req.body;

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
      await settings.save();

      res.status(200).json({ success: true, data: settings.paymentConfig });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
