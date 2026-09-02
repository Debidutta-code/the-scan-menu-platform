import { Types, ClientSession } from 'mongoose';
import { LoyaltyLedger, ILoyaltyLedger, LoyaltyTransactionType } from '../models/LoyaltyLedger';

export class LoyaltyRepository {
  async findByCustomerId(
    customerId: string | Types.ObjectId,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<ILoyaltyLedger[]> {
    return LoyaltyLedger.find({ customerId: new Types.ObjectId(customerId.toString()) })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async findByCustomerAndRestaurant(
    customerId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 50
  ): Promise<ILoyaltyLedger[]> {
    return LoyaltyLedger.find({
      customerId: new Types.ObjectId(customerId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async findEarnBatchesByCustomer(
    customerId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<ILoyaltyLedger[]> {
    return LoyaltyLedger.find({
      customerId: new Types.ObjectId(customerId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      type: 'EARN',
      remainingPoints: { $gt: 0 },
    }).sort({ createdAt: 1 });
  }

  async findExpiredByCustomer(
    customerId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    beforeDate: Date
  ): Promise<ILoyaltyLedger[]> {
    return LoyaltyLedger.find({
      customerId: new Types.ObjectId(customerId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      type: 'EARN',
      remainingPoints: { $gt: 0 },
      expiresAt: { $lt: beforeDate },
    });
  }

  async create(data: Partial<ILoyaltyLedger>, session?: ClientSession): Promise<ILoyaltyLedger> {
    const entry = new LoyaltyLedger(data);
    return entry.save({ session });
  }

  async save(entry: ILoyaltyLedger, session?: ClientSession): Promise<ILoyaltyLedger> {
    return entry.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ILoyaltyLedger>, session?: ClientSession): Promise<ILoyaltyLedger | null> {
    return LoyaltyLedger.findByIdAndUpdate(id, data, { new: true, session });
  }

  async countByCustomerAndRestaurant(
    customerId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {}
  ): Promise<number> {
    return LoyaltyLedger.countDocuments({
      customerId: new Types.ObjectId(customerId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      ...filter,
    });
  }

  async findByOrderAndRestaurant(
    orderId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    type: LoyaltyTransactionType = 'EARN'
  ): Promise<ILoyaltyLedger | null> {
    return LoyaltyLedger.findOne({
      orderId: new Types.ObjectId(orderId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      type,
    });
  }

  async findActiveEarnBatches(
    customerId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    now: Date = new Date()
  ): Promise<ILoyaltyLedger[]> {
    return LoyaltyLedger.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      customerId: new Types.ObjectId(customerId.toString()),
      type: 'EARN',
      remainingPoints: { $gt: 0 },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: 1 });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await LoyaltyLedger.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const loyaltyRepository = new LoyaltyRepository();
