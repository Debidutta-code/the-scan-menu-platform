import { MenuItem, IMenuItem } from '../models/MenuItem';
import { InventoryLog, ActorType } from '../models/InventoryLog';
import { NotificationService } from './notification.service';
import { webhookDispatcherService } from './webhookDispatcher.service';
import mongoose, { Types } from 'mongoose';
import { logger } from '../utils/logger';

export interface InventoryValidationResult {
  success: boolean;
  failedItems?: Array<{
    menuItemId: string;
    name: string;
    reason: 'unavailable' | 'category_inactive';
  }>;
}

export class InventoryService {
  /**
   * Toggles item availability (86'd status) directly.
   */
  async toggleItemAvailability(
    restaurantId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
    isAvailable: boolean,
    actor: { type: ActorType; id?: string }
  ): Promise<IMenuItem | null> {
    const item = await MenuItem.findOne({
      _id: itemId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId.toString()),
    });

    if (!item) return null;

    const previousAvailability = item.isAvailable;
    item.isAvailable = isAvailable;
    await item.save();

    // Audit log
    await InventoryLog.create({
      restaurantId: item.restaurantId,
      menuItemId: item._id,
      actorType: actor.type,
      actorId: actor.id ? new mongoose.Types.ObjectId(actor.id) : undefined,
      action: 'AVAILABILITY_TOGGLE',
      previousQuantity: item.stockQuantity,
      newQuantity: item.stockQuantity,
      previousAvailability,
      newAvailability: item.isAvailable,
      reason: isAvailable ? 'Marked available manually' : '86ed manually',
    });

    // Real-time Socket Notification
    NotificationService.getInstance().notifyInventoryUpdated(
      restaurantId.toString(),
      item._id.toString(),
      {
        isAvailable: item.isAvailable,
        trackStock: item.trackStock,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold,
      }
    );

    return item;
  }

  /**
   * Manual stock adjustment (restock, correction, low-stock threshold update).
   */
  async updateItemStock(
    restaurantId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
    stockData: {
      trackStock?: boolean;
      stockQuantity?: number;
      lowStockThreshold?: number;
      isAvailable?: boolean;
    },
    actor: { type: ActorType; id?: string }
  ): Promise<IMenuItem | null> {
    const item = await MenuItem.findOne({
      _id: itemId,
      restaurantId: new mongoose.Types.ObjectId(restaurantId.toString()),
    });

    if (!item) return null;

    const previousQuantity = item.stockQuantity;
    const previousAvailability = item.isAvailable;

    if (stockData.trackStock !== undefined) {
      item.trackStock = stockData.trackStock;
    }
    if (stockData.stockQuantity !== undefined) {
      item.stockQuantity = Math.max(0, stockData.stockQuantity);
    }
    if (stockData.lowStockThreshold !== undefined) {
      item.lowStockThreshold = Math.max(0, stockData.lowStockThreshold);
    }

    if (stockData.isAvailable !== undefined) {
      item.isAvailable = stockData.isAvailable;
    } else if (item.trackStock) {
      if (item.stockQuantity === 0) {
        item.isAvailable = false;
      } else if (!previousAvailability && previousQuantity === 0 && item.stockQuantity > 0) {
        item.isAvailable = true;
      }
    }

    await item.save();

    // Audit Log
    await InventoryLog.create({
      restaurantId: item.restaurantId,
      menuItemId: item._id,
      actorType: actor.type,
      actorId: actor.id ? new mongoose.Types.ObjectId(actor.id) : undefined,
      action: 'STOCK_ADJUSTMENT',
      previousQuantity,
      newQuantity: item.stockQuantity,
      previousAvailability,
      newAvailability: item.isAvailable,
      reason: `Stock set to ${item.stockQuantity}`,
    });

    // Real-time Socket Notification
    NotificationService.getInstance().notifyInventoryUpdated(
      restaurantId.toString(),
      item._id.toString(),
      {
        isAvailable: item.isAvailable,
        trackStock: item.trackStock,
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold,
      }
    );

    return item;
  }

  /**
   * Concurrency-safe stock verification & atomic decrement on order creation.
   */
  async validateAndDecrementStock(
    restaurantId: string | Types.ObjectId,
    items: Array<{ itemId: string; quantity: number; name?: string }>,
    orderId?: string
  ): Promise<InventoryValidationResult> {
    const rId = new mongoose.Types.ObjectId(restaurantId.toString());
    const failedItems: Array<{ menuItemId: string; name: string; reason: 'unavailable' | 'category_inactive' }> = [];

    // Step 1: Query all requested items
    const itemIds = items.map((i) => new mongoose.Types.ObjectId(i.itemId));
    const dbItems = await MenuItem.find({ _id: { $in: itemIds }, restaurantId: rId });
    const itemMap = new Map(dbItems.map((item) => [item._id.toString(), item]));

    // Check availability & pre-stock condition
    for (const requested of items) {
      const dbItem = itemMap.get(requested.itemId);
      if (!dbItem || dbItem.restaurantId.toString() !== rId.toString()) {
        failedItems.push({
          menuItemId: requested.itemId,
          name: requested.name || 'Unknown Item',
          reason: 'unavailable',
        });
        continue;
      }

      if (!dbItem.isAvailable) {
        failedItems.push({
          menuItemId: dbItem._id.toString(),
          name: dbItem.name,
          reason: 'unavailable',
        });
        continue;
      }

      if (dbItem.trackStock && dbItem.stockQuantity < requested.quantity) {
        failedItems.push({
          menuItemId: dbItem._id.toString(),
          name: dbItem.name,
          reason: 'unavailable',
        });
        continue;
      }
    }

    if (failedItems.length > 0) {
      return { success: false, failedItems };
    }

    // Step 2: Atomic Decrement for tracked items
    const decrementedItems: Array<{ itemId: string; quantity: number }> = [];

    for (const requested of items) {
      const dbItem = itemMap.get(requested.itemId);
      if (!dbItem || !dbItem.trackStock) continue;

      const updatedItem = await MenuItem.findOneAndUpdate(
        {
          _id: dbItem._id,
          restaurantId: rId,
          isAvailable: true,
          trackStock: true,
          stockQuantity: { $gte: requested.quantity },
        },
        { $inc: { stockQuantity: -requested.quantity } },
        { new: true }
      );

      if (!updatedItem) {
        // Race condition failure! Rollback any previously decremented items
        logger.warn(
          `[InventoryService] Stock decrement race condition failed for item ${requested.itemId}. Rolling back.`
        );
        for (const dec of decrementedItems) {
          await MenuItem.updateOne(
            { _id: dec.itemId, restaurantId: rId },
            { $inc: { stockQuantity: dec.quantity } }
          );
        }

        return {
          success: false,
          failedItems: [
            {
              menuItemId: requested.itemId,
              name: requested.name || dbItem.name,
              reason: 'unavailable',
            },
          ],
        };
      }

      decrementedItems.push({ itemId: requested.itemId, quantity: requested.quantity });

      // Auto-86 check when stock hits 0
      let auto86ed = false;
      if (updatedItem.stockQuantity === 0) {
        updatedItem.isAvailable = false;
        await updatedItem.save();
        auto86ed = true;

        await InventoryLog.create({
          restaurantId: rId,
          menuItemId: updatedItem._id,
          actorType: 'SYSTEM',
          action: 'AUTO_86',
          previousQuantity: requested.quantity,
          newQuantity: 0,
          previousAvailability: true,
          newAvailability: false,
          orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
          reason: 'Auto 86 on zero stock',
        });
      }

      if (updatedItem.stockQuantity <= (updatedItem.lowStockThreshold || 5)) {
        webhookDispatcherService.dispatchEvent(rId, 'inventory.low_stock', {
          menuItemId: updatedItem._id.toString(),
          name: updatedItem.name,
          stockQuantity: updatedItem.stockQuantity,
          isAvailable: updatedItem.isAvailable,
        });
      }

      // Log order decrement
      await InventoryLog.create({
        restaurantId: rId,
        menuItemId: updatedItem._id,
        actorType: 'ORDER',
        action: 'ORDER_DECREMENT',
        previousQuantity: updatedItem.stockQuantity + requested.quantity,
        newQuantity: updatedItem.stockQuantity,
        previousAvailability: true,
        newAvailability: updatedItem.isAvailable,
        orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
        reason: `Decremented by ${requested.quantity} for order`,
      });

      // Real-time Socket Notification
      NotificationService.getInstance().notifyInventoryUpdated(
        restaurantId.toString(),
        updatedItem._id.toString(),
        {
          isAvailable: updatedItem.isAvailable,
          trackStock: updatedItem.trackStock,
          stockQuantity: updatedItem.stockQuantity,
          lowStockThreshold: updatedItem.lowStockThreshold,
          auto86ed,
        }
      );
    }

    return { success: true };
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
