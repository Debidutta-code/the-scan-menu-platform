import { Types, ClientSession } from 'mongoose';
import { Tax, ITax } from '../models/Tax';

export class TaxRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<ITax[]> {
    return Tax.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async findActiveByRestaurantId(restaurantId: string | Types.ObjectId): Promise<ITax[]> {
    return Tax.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), isActive: true });
  }

  async findById(id: string | Types.ObjectId): Promise<ITax | null> {
    return Tax.findById(id);
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<ITax | null> {
    return Tax.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async create(data: Partial<ITax>, session?: ClientSession): Promise<ITax> {
    const tax = new Tax(data);
    return tax.save({ session });
  }

  async insertMany(taxes: Partial<ITax>[], session?: ClientSession): Promise<ITax[]> {
    return Tax.insertMany(taxes, { session }) as unknown as ITax[];
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ITax>, session?: ClientSession): Promise<ITax | null> {
    return Tax.findByIdAndUpdate(id, data, { new: true, session });
  }

  async updateByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    data: Partial<ITax>,
    session?: ClientSession
  ): Promise<ITax | null> {
    return Tax.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()), restaurantId: new Types.ObjectId(restaurantId.toString()) },
      data,
      { new: true, session }
    );
  }

  async deleteById(id: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Tax.findByIdAndDelete(id, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Tax.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const taxRepository = new TaxRepository();
