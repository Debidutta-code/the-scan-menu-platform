import { Response, NextFunction } from 'express';
import { ApiKeyRequest } from '../middleware/apiKey.middleware';
import { categoryRepository } from '../repositories/category.repository';
import { menuItemRepository } from '../repositories/menuItem.repository';
import { orderRepository } from '../repositories/order.repository';
import { webhookDispatcherService } from '../services/webhookDispatcher.service';
import { createWebhookSubscriptionSchema } from '../validators/webhook.validator';
import { sendSuccess, sendError } from '../utils/response';
import { getNextOrderNumber } from '../utils/orderCounter';
import { Types } from 'mongoose';

export class OpenApiController {
  constructor() {
    this.getMenu = this.getMenu.bind(this);
    this.getOrders = this.getOrders.bind(this);
    this.createOrder = this.createOrder.bind(this);
    this.getWebhooks = this.getWebhooks.bind(this);
    this.createWebhook = this.createWebhook.bind(this);
    this.deleteWebhook = this.deleteWebhook.bind(this);
  }

  /**
   * GET /api/v1/openapi/menu
   */
  async getMenu(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rId = new Types.ObjectId(req.restaurantId);
      const categories = await categoryRepository.findByRestaurantId(rId, { isArchived: false }, { sortOrder: 1 });
      const items = await menuItemRepository.findByRestaurantId(rId, { isArchived: false }, { sortOrder: 1 });

      sendSuccess(res, { categories, items }, 'Public catalog menu retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/v1/openapi/orders
   */
  async getOrders(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rId = new Types.ObjectId(req.restaurantId);
      const { status, limit } = req.query;

      const filter: any = {};
      if (status && typeof status === 'string') {
        filter.status = status;
      }

      const limitNum = limit ? Math.min(Number(limit), 100) : 50;

      const orders = await orderRepository.findByRestaurantId(rId, filter, { createdAt: -1 }, 0, limitNum);

      sendSuccess(res, orders, 'Orders retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/v1/openapi/orders
   */
  async createOrder(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const rId = new Types.ObjectId(req.restaurantId);
      const { items, orderMode, customerName, customerPhone, deliveryAddress, total } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        sendError(res, 'INVALID_PAYLOAD', 'Items array is required', null, 400);
        return;
      }

      const orderNumber = await getNextOrderNumber(rId);

      const order = await orderRepository.create({
        restaurantId: rId,
        orderNumber,
        orderMode: orderMode || 'TAKEAWAY',
        source: 'API',
        items,
        status: 'PENDING',
        paymentStatus: 'PAID',
        subtotal: total || 0,
        tax: 0,
        total: total || 0,
        customerName: customerName || 'API Customer',
        customerPhone,
        deliveryAddress,
      });

      // Dispatch webhook non-blockingly
      webhookDispatcherService.dispatchEvent(rId, 'order.created', (order as any).toObject ? (order as any).toObject() : order);

      sendSuccess(res, order, 'External order created successfully', 201);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/v1/openapi/webhooks
   */
  async getWebhooks(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriptions = await webhookDispatcherService.listSubscriptions(req.restaurantId!);
      sendSuccess(res, subscriptions, 'Webhook subscriptions retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/v1/openapi/webhooks
   */
  async createWebhook(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = createWebhookSubscriptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendError(res, 'INVALID_PAYLOAD', parseResult.error.errors[0]?.message || 'Invalid webhook payload', null, 400);
        return;
      }

      const sub = await webhookDispatcherService.createSubscription(req.restaurantId!, parseResult.data);
      sendSuccess(res, sub, 'Webhook subscription created successfully', 201);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/openapi/webhooks/:webhookId
   */
  async deleteWebhook(req: ApiKeyRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { webhookId } = req.params;
      const deleted = await webhookDispatcherService.deleteSubscription(req.restaurantId!, webhookId);

      if (!deleted) {
        sendError(res, 'NOT_FOUND', 'Webhook subscription not found', null, 404);
        return;
      }

      sendSuccess(res, { success: true }, 'Webhook subscription deleted successfully');
    } catch (error: any) {
      next(error);
    }
  }
}

export const openApiController = new OpenApiController();
export default openApiController;
