import { Types, ClientSession } from 'mongoose';
import { Shift, IShift } from '../models/Shift';

export class ShiftRepository {
  async findById(id: string | Types.ObjectId): Promise<IShift | null> {
    return Shift.findById(id);
  }

  async findByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IShift | null> {
    return Shift.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findOpenByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IShift | null> {
    return Shift.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()), status: 'OPEN' });
  }

  async findOpenByIdAndRestaurantId(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IShift | null> {
    return Shift.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      status: 'OPEN',
    });
  }

  async findLastByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IShift | null> {
    return Shift.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) }).sort({ shiftNumber: -1 });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<IShift[]> {
    return Shift.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('staffId', 'name');
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return Shift.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async create(data: Partial<IShift>, session?: ClientSession): Promise<IShift> {
    const shift = new Shift(data);
    return shift.save({ session });
  }

  async save(shift: IShift, session?: ClientSession): Promise<IShift> {
    return shift.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IShift>, session?: ClientSession): Promise<IShift | null> {
    return Shift.findByIdAndUpdate(id, data, { new: true, session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Shift.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const shiftRepository = new ShiftRepository();
