import { Types, ClientSession } from 'mongoose';
import { MenuItem, IMenuItem } from '../models/MenuItem';
import { InventoryLog, IInventoryLog, InventoryAction, ActorType } from '../models/InventoryLog';

export class InventoryRepository {
  // MenuItem stock operations
  async findItemsByLowStock(restaurantId: string | Types.ObjectId, threshold?: number): Promise<IMenuItem[]> {
    const query: Record<string, any> = {
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      trackStock: true,
      isArchived: false,
    };
    if (threshold !== undefined) {
      query.$expr = { $lte: ['$stockQuantity', '$lowStockThreshold'] };
    }
    return MenuItem.find(query);
  }

  async decrementStock(
    menuItemId: string | Types.ObjectId,
    quantity: number,
    session?: ClientSession
  ): Promise<IMenuItem | null> {
    return MenuItem.findByIdAndUpdate(
      menuItemId,
      { $inc: { stockQuantity: -quantity } },
      { new: true, session }
    );
  }

  async restoreStock(
    menuItemId: string | Types.ObjectId,
    quantity: number,
    session?: ClientSession
  ): Promise<IMenuItem | null> {
    return MenuItem.findByIdAndUpdate(
      menuItemId,
      { $inc: { stockQuantity: quantity } },
      { new: true, session }
    );
  }

  async updateAvailability(
    menuItemId: string | Types.ObjectId,
    isAvailable: boolean,
    session?: ClientSession
  ): Promise<IMenuItem | null> {
    return MenuItem.findByIdAndUpdate(
      menuItemId,
      { isAvailable },
      { new: true, session }
    );
  }

  // InventoryLog operations
  async createLog(data: Partial<IInventoryLog>, session?: ClientSession): Promise<IInventoryLog> {
    const log = new InventoryLog(data);
    return log.save({ session });
  }

  async findLogsByMenuItem(
    menuItemId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<IInventoryLog[]> {
    return InventoryLog.find({
      menuItemId: new Types.ObjectId(menuItemId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async countLogsByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {}
  ): Promise<number> {
    return InventoryLog.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async findLogsByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<IInventoryLog[]> {
    return InventoryLog.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async findLogsWithPopulate(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<IInventoryLog[]> {
    return InventoryLog.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('menuItemId', 'name price imageUrl')
      .populate('actorId', 'name email role')
      .populate('orderId', 'orderNumber total');
  }
}

export const inventoryRepository = new InventoryRepository();
