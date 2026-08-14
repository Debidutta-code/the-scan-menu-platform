import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { apiKeyService } from '../services/apiKey.service';
import { webhookDispatcherService } from '../services/webhookDispatcher.service';
import { createApiKeySchema } from '../validators/apiKey.validator';
import { createWebhookSubscriptionSchema } from '../validators/webhook.validator';
import { sendSuccess, sendError } from '../utils/response';

export class DeveloperController {
  constructor() {
    this.listApiKeys = this.listApiKeys.bind(this);
    this.createApiKey = this.createApiKey.bind(this);
    this.revokeApiKey = this.revokeApiKey.bind(this);
    this.listWebhooks = this.listWebhooks.bind(this);
    this.createWebhook = this.createWebhook.bind(this);
    this.deleteWebhook = this.deleteWebhook.bind(this);
    this.testWebhookPing = this.testWebhookPing.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/developer/api-keys
   */
  async listApiKeys(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const keys = await apiKeyService.listApiKeys(restaurantId);
      sendSuccess(res, keys, 'API keys retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/developer/api-keys
   */
  async createApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = createApiKeySchema.safeParse(req.body);
      if (!parseResult.success) {
        sendError(res, 'INVALID_PAYLOAD', parseResult.error.errors[0]?.message || 'Invalid API key parameters', null, 400);
        return;
      }

      const result = await apiKeyService.createApiKey(restaurantId, parseResult.data);
      sendSuccess(res, result, 'API key created successfully', 201);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/restaurants/:restaurantId/developer/api-keys/:keyId
   */
  async revokeApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, keyId } = req.params;
      const revoked = await apiKeyService.revokeApiKey(restaurantId, keyId);

      if (!revoked) {
        sendError(res, 'NOT_FOUND', 'API key not found', null, 404);
        return;
      }

      sendSuccess(res, { success: true }, 'API key revoked successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/developer/webhooks
   */
  async listWebhooks(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const subs = await webhookDispatcherService.listSubscriptions(restaurantId);
      sendSuccess(res, subs, 'Webhook subscriptions retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/developer/webhooks
   */
  async createWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = createWebhookSubscriptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendError(res, 'INVALID_PAYLOAD', parseResult.error.errors[0]?.message || 'Invalid webhook subscription parameters', null, 400);
        return;
      }

      const sub = await webhookDispatcherService.createSubscription(restaurantId, parseResult.data);
      sendSuccess(res, sub, 'Webhook subscription created successfully', 201);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/restaurants/:restaurantId/developer/webhooks/:webhookId
   */
  async deleteWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, webhookId } = req.params;
      const deleted = await webhookDispatcherService.deleteSubscription(restaurantId, webhookId);

      if (!deleted) {
        sendError(res, 'NOT_FOUND', 'Webhook subscription not found', null, 404);
        return;
      }

      sendSuccess(res, { success: true }, 'Webhook subscription deleted successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/developer/webhooks/:webhookId/test
   */
  async testWebhookPing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const pingPayload = {
        event: 'ping.test',
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook ping from The Scan Menu developer portal.',
      };

      webhookDispatcherService.dispatchEvent(restaurantId, 'order.created' as any, pingPayload);
      sendSuccess(res, { success: true }, 'Test webhook ping dispatched');
    } catch (error: any) {
      next(error);
    }
  }
}

export const developerController = new DeveloperController();
export default developerController;
