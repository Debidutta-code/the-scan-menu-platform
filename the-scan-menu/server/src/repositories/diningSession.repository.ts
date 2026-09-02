import { Types, ClientSession } from 'mongoose';
import { DiningSession, IDiningSession, DiningSessionStatus } from '../models/DiningSession';

export class DiningSessionRepository {
  async findById(id: string | Types.ObjectId): Promise<IDiningSession | null> {
    return DiningSession.findById(id);
  }

  async findByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IDiningSession | null> {
    return DiningSession.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByIdAndRestaurantWithPopulate(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IDiningSession | null> {
    return DiningSession.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    }).populate('tableId', 'displayName tableNumber');
  }

  async findActiveByTableAndRestaurant(
    tableId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IDiningSession | null> {
    return DiningSession.findOne({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      tableId: new Types.ObjectId(tableId.toString()),
      status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
    });
  }

  async findActiveByTableId(tableId: string | Types.ObjectId): Promise<IDiningSession | null> {
    return DiningSession.findOne({
      tableId: new Types.ObjectId(tableId.toString()),
      status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
    });
  }

  async incFinancials(
    id: string | Types.ObjectId,
    incData: { subtotal?: number; tax?: number; total?: number; balanceDue?: number; roundCount?: number }
  ): Promise<IDiningSession | null> {
    return DiningSession.findByIdAndUpdate(
      id,
      {
        $inc: incData,
        $set: { lastActivityAt: new Date() },
      },
      { new: true }
    );
  }

  async findBySessionCode(sessionCode: string, restaurantId: string | Types.ObjectId): Promise<IDiningSession | null> {
    return DiningSession.findOne({
      sessionCode,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 }
  ): Promise<IDiningSession[]> {
    return DiningSession.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter }).sort(sort);
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return DiningSession.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async create(data: Partial<IDiningSession>, session?: ClientSession): Promise<IDiningSession> {
    const diningSession = new DiningSession(data);
    return diningSession.save({ session });
  }

  async save(diningSession: IDiningSession, session?: ClientSession): Promise<IDiningSession> {
    return diningSession.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IDiningSession>, session?: ClientSession): Promise<IDiningSession | null> {
    return DiningSession.findByIdAndUpdate(id, data, { new: true, session });
  }

  async updateByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    data: Partial<IDiningSession>,
    session?: ClientSession
  ): Promise<IDiningSession | null> {
    return DiningSession.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()), restaurantId: new Types.ObjectId(restaurantId.toString()) },
      data,
      { new: true, session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await DiningSession.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const diningSessionRepository = new DiningSessionRepository();
