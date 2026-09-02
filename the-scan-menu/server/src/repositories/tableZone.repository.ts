import { Types, ClientSession } from 'mongoose';
import { TableZone, ITableZone } from '../models/TableZone';

export class TableZoneRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<ITableZone[]> {
    return TableZone.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) }).sort({ name: 1 });
  }

  async findById(id: string | Types.ObjectId): Promise<ITableZone | null> {
    return TableZone.findById(id);
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<ITableZone | null> {
    return TableZone.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async create(data: Partial<ITableZone>, session?: ClientSession): Promise<ITableZone> {
    const zone = new TableZone(data);
    return zone.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ITableZone>, session?: ClientSession): Promise<ITableZone | null> {
    return TableZone.findByIdAndUpdate(id, data, { new: true, session });
  }

  async deleteById(id: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await TableZone.findByIdAndDelete(id, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await TableZone.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const tableZoneRepository = new TableZoneRepository();
