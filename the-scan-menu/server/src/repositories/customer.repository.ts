import { Types, ClientSession } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';

export class CustomerRepository {
  async findById(id: string | Types.ObjectId): Promise<ICustomer | null> {
    return Customer.findById(id);
  }

  async findByPhoneAndRestaurant(phone: string, restaurantId: string | Types.ObjectId): Promise<ICustomer | null> {
    return Customer.findOne({
      phone,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<ICustomer[]> {
    return Customer.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async findOneByRestaurant(restaurantId: string | Types.ObjectId, filter: Record<string, any>): Promise<ICustomer | null> {
    return Customer.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return Customer.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async create(data: Partial<ICustomer>, session?: ClientSession): Promise<ICustomer> {
    const customer = new Customer(data);
    return customer.save({ session });
  }

  async save(customer: ICustomer, session?: ClientSession): Promise<ICustomer> {
    return customer.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ICustomer>, session?: ClientSession): Promise<ICustomer | null> {
    return Customer.findByIdAndUpdate(id, data, { new: true, session });
  }

  async findOrCreate(
    restaurantId: string | Types.ObjectId,
    phone: string,
    name: string,
    session?: ClientSession
  ): Promise<ICustomer> {
    const existing = await this.findByPhoneAndRestaurant(phone, restaurantId);
    if (existing) return existing;
    return this.create(
      { restaurantId: new Types.ObjectId(restaurantId.toString()), phone, name },
      session
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Customer.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const customerRepository = new CustomerRepository();
