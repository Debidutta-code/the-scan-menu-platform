import { Types, ClientSession } from 'mongoose';
import { Bill, IBill, BillStatus } from '../models/Bill';

export class BillRepository {
  async findById(id: string | Types.ObjectId): Promise<IBill | null> {
    return Bill.findById(id);
  }

  async findByDiningSessionId(diningSessionId: string | Types.ObjectId): Promise<IBill | null> {
    return Bill.findOne({
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
      status: { $in: ['PENDING', 'SETTLED'] },
    }).sort({ version: -1 });
  }

  async findLatestByDiningSessionId(diningSessionId: string | Types.ObjectId, session?: ClientSession): Promise<IBill | null> {
    return this.findByDiningSessionId(diningSessionId);
  }

  async findPendingByDiningSessionId(diningSessionId: string | Types.ObjectId, session?: ClientSession): Promise<IBill | null> {
    return Bill.findOne({
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
      status: 'PENDING',
    }, null, { session });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {}
  ): Promise<IBill[]> {
    return Bill.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async countVersionsByDiningSession(diningSessionId: string | Types.ObjectId): Promise<number> {
    return Bill.countDocuments({ diningSessionId: new Types.ObjectId(diningSessionId.toString()) });
  }

  async create(data: Partial<IBill>, session?: ClientSession): Promise<IBill> {
    const bill = new Bill(data);
    return bill.save({ session });
  }

  async save(bill: IBill, session?: ClientSession): Promise<IBill> {
    return bill.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IBill>, session?: ClientSession): Promise<IBill | null> {
    return Bill.findByIdAndUpdate(id, data, { new: true, session });
  }

  async updateManyByDiningSession(
    diningSessionId: string | Types.ObjectId,
    data: Partial<IBill>,
    session?: ClientSession
  ): Promise<void> {
    await Bill.updateMany(
      { diningSessionId: new Types.ObjectId(diningSessionId.toString()) },
      data,
      { session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Bill.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const billRepository = new BillRepository();
