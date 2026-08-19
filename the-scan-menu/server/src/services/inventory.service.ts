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

  /**
   * Restores inventory quantities when an order is cancelled or voided.
   */
  async restoreStockForOrder(
    restaurantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    items: Array<{ itemId: string | Types.ObjectId; quantity: number; name?: string }>,
    actor: { type: ActorType; id?: string }
  ): Promise<void> {
    const rId = new mongoose.Types.ObjectId(restaurantId.toString());
    const oId = new mongoose.Types.ObjectId(orderId.toString());

    for (const orderItem of items) {
      if (!orderItem.itemId || orderItem.quantity <= 0) continue;

      const itemId = new mongoose.Types.ObjectId(orderItem.itemId.toString());
      const item = await MenuItem.findOne({ _id: itemId, restaurantId: rId });

      if (!item || !item.trackStock) continue;

      const previousQuantity = item.stockQuantity;
      const previousAvailability = item.isAvailable;

      item.stockQuantity = item.stockQuantity + orderItem.quantity;
      if (!item.isAvailable && item.stockQuantity > 0) {
        item.isAvailable = true;
      }

      await item.save();

      // Audit Log
      await InventoryLog.create({
        restaurantId: rId,
        menuItemId: item._id,
        actorType: actor.type,
        actorId: actor.id ? new mongoose.Types.ObjectId(actor.id) : undefined,
        action: 'ORDER_RESTORE',
        previousQuantity,
        newQuantity: item.stockQuantity,
        previousAvailability,
        newAvailability: item.isAvailable,
        orderId: oId,
        reason: `Restored ${orderItem.quantity} portions from cancelled order #${orderId}`,
      });

      // Socket update
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
    }
  }

  /**
   * Batch stock adjustment for daily physical stocktake / physical count audit.
   */
  async batchAdjustStock(
    restaurantId: string | Types.ObjectId,
    adjustments: Array<{
      itemId: string;
      stockQuantity: number;
      trackStock?: boolean;
      notes?: string;
    }>,
    actor: { type: ActorType; id?: string }
  ): Promise<{ updatedCount: number; items: IMenuItem[] }> {
    const rId = new mongoose.Types.ObjectId(restaurantId.toString());
    const updatedItems: IMenuItem[] = [];

    for (const adj of adjustments) {
      const item = await MenuItem.findOne({ _id: adj.itemId, restaurantId: rId });
      if (!item) continue;

      const previousQuantity = item.stockQuantity;
      const previousAvailability = item.isAvailable;

      if (adj.trackStock !== undefined) {
        item.trackStock = adj.trackStock;
      }
      item.stockQuantity = Math.max(0, adj.stockQuantity);

      if (item.trackStock) {
        if (item.stockQuantity === 0) {
          item.isAvailable = false;
        } else if (!previousAvailability && previousQuantity === 0 && item.stockQuantity > 0) {
          item.isAvailable = true;
        }
      }

      await item.save();
      updatedItems.push(item);

      await InventoryLog.create({
        restaurantId: rId,
        menuItemId: item._id,
        actorType: actor.type,
        actorId: actor.id ? new mongoose.Types.ObjectId(actor.id) : undefined,
        action: 'BATCH_STOCKTAKE',
        previousQuantity,
        newQuantity: item.stockQuantity,
        previousAvailability,
        newAvailability: item.isAvailable,
        reason: adj.notes || `Stocktake count set to ${item.stockQuantity}`,
        notes: adj.notes,
      });

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
    }

    return { updatedCount: updatedItems.length, items: updatedItems };
  }

  /**
   * Records spoilage, dropped plates, or expired inventory portions (Food Waste).
   */
  async logWaste(
    restaurantId: string | Types.ObjectId,
    itemId: string | Types.ObjectId,
    quantity: number,
    reason: string,
    actor: { type: ActorType; id?: string },
    costPaise?: number,
    notes?: string
  ): Promise<IMenuItem | null> {
    const rId = new mongoose.Types.ObjectId(restaurantId.toString());
    const item = await MenuItem.findOne({ _id: itemId, restaurantId: rId });

    if (!item) return null;

    const previousQuantity = item.stockQuantity;
    const previousAvailability = item.isAvailable;

    if (item.trackStock) {
      item.stockQuantity = Math.max(0, item.stockQuantity - quantity);
      if (item.stockQuantity === 0) {
        item.isAvailable = false;
      }
      await item.save();
    }

    await InventoryLog.create({
      restaurantId: rId,
      menuItemId: item._id,
      actorType: actor.type,
      actorId: actor.id ? new mongoose.Types.ObjectId(actor.id) : undefined,
      action: 'WASTE_LOG',
      previousQuantity,
      newQuantity: item.stockQuantity,
      previousAvailability,
      newAvailability: item.isAvailable,
      reason: `Waste logged: ${quantity} portions (${reason})`,
      costPaise: costPaise || (item.price ? Math.round(item.price * quantity) : undefined),
      notes: notes || reason,
    });

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
   * Retrieves paginated inventory logs for audit history and dispute resolution.
   */
  async getInventoryLogs(
    restaurantId: string | Types.ObjectId,
    query: {
      menuItemId?: string;
      action?: string;
      actorType?: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{ logs: any[]; total: number; page: number; totalPages: number }> {
    const rId = new mongoose.Types.ObjectId(restaurantId.toString());
    const filter: any = { restaurantId: rId };

    if (query.menuItemId) {
      filter.menuItemId = new mongoose.Types.ObjectId(query.menuItemId);
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (query.actorType) {
      filter.actorType = query.actorType;
    }
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      InventoryLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('menuItemId', 'name price imageUrl')
        .populate('actorId', 'name email role')
        .populate('orderId', 'orderNumber total')
        .lean(),
      InventoryLog.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aggregates real-time inventory metrics (total tracked items, in-stock, low-stock, out-of-stock, waste cost).
   */
  async getInventorySummary(restaurantId: string | Types.ObjectId): Promise<{
    totalItems: number;
    trackedItems: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalWasteValuePaise: number;
  }> {
    const rId = new mongoose.Types.ObjectId(restaurantId.toString());

    const items = await MenuItem.find({ restaurantId: rId }).select('isAvailable trackStock stockQuantity lowStockThreshold');

    const totalItems = items.length;
    let trackedItems = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of items) {
      const threshold = item.lowStockThreshold || 5;
      const isTracked = !!item.trackStock;
      if (isTracked) trackedItems++;

      if (!item.isAvailable || (isTracked && item.stockQuantity <= 0)) {
        outOfStockCount++;
      } else if (isTracked && item.stockQuantity <= threshold) {
        lowStockCount++;
      } else {
        inStockCount++;
      }
    }

    // Calculate last 30 days waste cost
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const wasteLogs = await InventoryLog.find({
      restaurantId: rId,
      action: 'WASTE_LOG',
      createdAt: { $gte: thirtyDaysAgo },
    }).select('costPaise');

    const totalWasteValuePaise = wasteLogs.reduce((sum, log) => sum + (log.costPaise || 0), 0);

    return {
      totalItems,
      trackedItems,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalWasteValuePaise,
    };
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
