import { Types, ClientSession } from 'mongoose';
import { WaiterCall, IWaiterCall, WaiterCallStatus } from '../models/WaiterCall';

export class WaiterCallRepository {
  async findById(id: string | Types.ObjectId): Promise<IWaiterCall | null> {
    return WaiterCall.findById(id);
  }

  async findByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IWaiterCall | null> {
    return WaiterCall.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findActiveByTableId(tableId: string | Types.ObjectId): Promise<IWaiterCall | null> {
    return WaiterCall.findOne({
      tableId: new Types.ObjectId(tableId.toString()),
      status: { $in: ['PENDING', 'ACKNOWLEDGED'] },
    });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<IWaiterCall[]> {
    return WaiterCall.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return WaiterCall.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async create(data: Partial<IWaiterCall>, session?: ClientSession): Promise<IWaiterCall> {
    const waiterCall = new WaiterCall(data);
    return waiterCall.save({ session });
  }

  async save(waiterCall: IWaiterCall, session?: ClientSession): Promise<IWaiterCall> {
    return waiterCall.save({ session });
  }

  async expireStalePendingByTableId(tableId: string | Types.ObjectId, beforeDate: Date): Promise<void> {
    await WaiterCall.updateMany(
      { tableId: new Types.ObjectId(tableId.toString()), status: 'PENDING', createdAt: { $lte: beforeDate } },
      { $set: { status: 'EXPIRED' } }
    );
  }

  async expireStalePendingByRestaurantId(restaurantId: string | Types.ObjectId, beforeDate: Date): Promise<void> {
    await WaiterCall.updateMany(
      {
        restaurantId: new Types.ObjectId(restaurantId.toString()),
        status: 'PENDING',
        createdAt: { $lte: beforeDate },
      },
      { $set: { status: 'EXPIRED' } }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await WaiterCall.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const waiterCallRepository = new WaiterCallRepository();
