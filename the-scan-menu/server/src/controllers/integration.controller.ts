import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { posIntegrationService } from '../services/posIntegration.service';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { encrypt } from '../utils/encryption';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';

export class IntegrationController {
  constructor() {
    this.getSyncLogs = this.getSyncLogs.bind(this);
    this.updatePetpoojaConfig = this.updatePetpoojaConfig.bind(this);
    this.getIntegrationConfig = this.getIntegrationConfig.bind(this);
    this.triggerMenuSync = this.triggerMenuSync.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/integrations/sync-logs
   * Manager / Super Admin only.
   */
  async getSyncLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'BAD_REQUEST', 'Invalid restaurant ID format', null, 400);
        return;
      }

      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status ? (req.query.status as string) : undefined;

      const result = await posIntegrationService.getSyncLogs(restaurantId, { page, limit, status });

      sendSuccess(res, result, 'Integration sync logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/integrations/config
   * Manager / Super Admin only.
   * Returns safe write-only configuration metadata (never returning plain secret keys).
   */
  async getIntegrationConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'BAD_REQUEST', 'Invalid restaurant ID format', null, 400);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId });
      const integrationConfig = settings?.paymentConfig?.integrationConfig || { provider: 'NONE', config: {} };

      const provider = integrationConfig.provider || 'NONE';
      const config = integrationConfig.config || {};

      const safeData = {
        provider,
        outletId: config.outletId || config.restaurantId || '',
        enabled: config.enabled !== false,
        isConfigured: Boolean(config.appKey || config.accessToken),
      };

      sendSuccess(res, safeData, 'Integration configuration retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/restaurants/:restaurantId/integrations/petpooja/config
   * Manager / Super Admin only.
   * Configures Petpooja credentials with AES-256-GCM encryption for secrets.
   */
  async updatePetpoojaConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { appKey, appSecret, accessToken, outletId, apiUrl, enabled, provider } = req.body;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'BAD_REQUEST', 'Invalid restaurant ID format', null, 400);
        return;
      }

      const settings = await RestaurantSettings.findOne({ restaurantId });
      if (!settings) {
        sendError(res, 'NOT_FOUND', 'Restaurant settings not found', null, 404);
        return;
      }

      const existingConfig = settings.paymentConfig?.integrationConfig?.config || {};

      // Encrypt sensitive credential strings before saving
      const encryptedAppKey = appKey !== undefined ? (appKey ? encrypt(appKey) : '') : existingConfig.appKey;
      const encryptedAppSecret = appSecret !== undefined ? (appSecret ? encrypt(appSecret) : '') : existingConfig.appSecret;
      const encryptedAccessToken = accessToken !== undefined ? (accessToken ? encrypt(accessToken) : '') : existingConfig.accessToken;

      const targetProvider = provider ? provider.toUpperCase() : 'PETPOOJA';

      settings.paymentConfig.integrationConfig = {
        provider: targetProvider,
        config: {
          ...existingConfig,
          appKey: encryptedAppKey,
          appSecret: encryptedAppSecret,
          accessToken: encryptedAccessToken,
          outletId: outletId !== undefined ? outletId : existingConfig.outletId,
          apiUrl: apiUrl !== undefined ? apiUrl : existingConfig.apiUrl,
          enabled: enabled !== undefined ? enabled : true,
        },
      };

      await settings.save();

      const safeResponse = {
        provider: targetProvider,
        outletId: settings.paymentConfig.integrationConfig.config.outletId || '',
        enabled: settings.paymentConfig.integrationConfig.config.enabled,
        isConfigured: true,
      };

      sendSuccess(res, safeResponse, 'Petpooja integration configuration updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/integrations/petpooja/sync-menu
   * Manager / Super Admin only.
   * Manually triggers non-blocking menu synchronization.
   */
  async triggerMenuSync(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        sendError(res, 'BAD_REQUEST', 'Invalid restaurant ID format', null, 400);
        return;
      }

      await posIntegrationService.syncMenuAsync(restaurantId);

      sendSuccess(res, { restaurantId, status: 'SYNC_INITIATED' }, 'Petpooja menu synchronization initiated in background');
    } catch (error) {
      next(error);
    }
  }
}

export const integrationController = new IntegrationController();
export default integrationController;
