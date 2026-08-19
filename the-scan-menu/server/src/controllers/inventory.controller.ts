import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { inventoryService } from '../services/inventory.service';
import { sendSuccess, sendError } from '../utils/response';

export class InventoryController {
  constructor() {
    this.listInventoryLogs = this.listInventoryLogs.bind(this);
    this.getInventorySummary = this.getInventorySummary.bind(this);
    this.batchAdjustStock = this.batchAdjustStock.bind(this);
    this.logWaste = this.logWaste.bind(this);
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/inventory/logs
   * Retrieves paginated inventory audit logs.
   */
  async listInventoryLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { menuItemId, action, actorType, page, limit, startDate, endDate } = req.query;

      const result = await inventoryService.getInventoryLogs(restaurantId, {
        menuItemId: menuItemId as string,
        action: action as string,
        actorType: actorType as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      sendSuccess(res, result, 'Inventory logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/restaurants/:restaurantId/inventory/summary
   * Aggregates live inventory status metrics.
   */
  async getInventorySummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const summary = await inventoryService.getInventorySummary(restaurantId);
      sendSuccess(res, summary, 'Inventory summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/inventory/batch-adjust
   * Multi-item physical count / stocktake update.
   */
  async batchAdjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { adjustments } = req.body;

      if (!Array.isArray(adjustments) || adjustments.length === 0) {
        sendError(res, 'BAD_REQUEST', 'adjustments array is required', null, 400);
        return;
      }

      const actorType = req.user?.role === 'STAFF' ? 'STAFF' : 'MANAGER';

      const result = await inventoryService.batchAdjustStock(
        restaurantId,
        adjustments,
        { type: actorType, id: req.user?.id }
      );

      sendSuccess(res, result, `Stocktake committed. ${result.updatedCount} items updated.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/restaurants/:restaurantId/inventory/waste
   * Records spoilage / food waste deduction.
   */
  async logWaste(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { itemId, quantity, reason, costPaise, notes } = req.body;

      if (!itemId || !quantity || quantity <= 0) {
        sendError(res, 'BAD_REQUEST', 'itemId and a positive quantity are required', null, 400);
        return;
      }

      const actorType = req.user?.role === 'STAFF' ? 'STAFF' : 'MANAGER';

      const updatedItem = await inventoryService.logWaste(
        restaurantId,
        itemId,
        quantity,
        reason || 'Unspecified waste',
        { type: actorType, id: req.user?.id },
        costPaise,
        notes
      );

      if (!updatedItem) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      sendSuccess(res, updatedItem, 'Waste logged successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
export default inventoryController;
