import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { whiteLabelService } from '../services/whiteLabel.service';
import { whiteLabelConfigSchema } from '../validators/whiteLabel.validator';
import { sendSuccess, sendError } from '../utils/response';

export class WhiteLabelController {
  constructor() {
    this.getConfig = this.getConfig.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
    this.getByDomain = this.getByDomain.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/white-label
   */
  async getConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const config = await whiteLabelService.getWhiteLabelConfig(restaurantId);
      sendSuccess(res, config, 'White label configuration retrieved successfully');
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/restaurants/:restaurantId/white-label
   */
  async updateConfig(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;

      const parseResult = whiteLabelConfigSchema.safeParse(req.body);
      if (!parseResult.success) {
        sendError(res, 'INVALID_CONFIG', parseResult.error.errors[0]?.message || 'Invalid white label configuration payload', null, 400);
        return;
      }

      const updated = await whiteLabelService.updateWhiteLabelConfig(restaurantId, parseResult.data);
      sendSuccess(res, updated, 'White label configuration updated successfully');
    } catch (error: any) {
      if (error.message === 'CUSTOM_DOMAIN_TAKEN') {
        sendError(res, 'CUSTOM_DOMAIN_TAKEN', 'This custom domain is already registered to another restaurant', null, 409);
        return;
      }
      if (error.message === 'RESTAURANT_SETTINGS_NOT_FOUND') {
        sendError(res, 'NOT_FOUND', 'Restaurant settings not found', null, 404);
        return;
      }
      next(error);
    }
  }

  /**
   * GET /api/v1/public/white-label/domain/:domain
   */
  async getByDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { domain } = req.params;
      const result = await whiteLabelService.getByCustomDomain(domain);

      if (!result) {
        sendError(res, 'DOMAIN_NOT_FOUND', 'No active tenant found for this custom domain', null, 404);
        return;
      }

      sendSuccess(res, result, 'Custom domain tenant resolved successfully');
    } catch (error: any) {
      next(error);
    }
  }
}

export const whiteLabelController = new WhiteLabelController();
export default whiteLabelController;
