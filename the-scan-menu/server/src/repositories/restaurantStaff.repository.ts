import { Types, ClientSession } from 'mongoose';
import { RestaurantStaff, IRestaurantStaff } from '../models/RestaurantStaff';

export class RestaurantStaffRepository {
  async findByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IRestaurantStaff[]> {
    return RestaurantStaff.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async findByRestaurantIdPopulated(restaurantId: string | Types.ObjectId): Promise<IRestaurantStaff[]> {
    return RestaurantStaff.find({ restaurantId: new Types.ObjectId(restaurantId.toString()) }).populate('userId');
  }

  async findActiveByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IRestaurantStaff[]> {
    return RestaurantStaff.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), isActive: true });
  }

  async findActiveByRestaurantIdPopulated(restaurantId: string | Types.ObjectId): Promise<IRestaurantStaff[]> {
    return RestaurantStaff.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isActive: true,
    }).populate('userId');
  }

  async findActiveManagersByRestaurantIdPopulated(restaurantId: string | Types.ObjectId): Promise<IRestaurantStaff[]> {
    return RestaurantStaff.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      role: 'MANAGER',
      isActive: true,
    }).populate('userId');
  }

  async findByUserIdAndRestaurantId(
    userId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IRestaurantStaff | null> {
    return RestaurantStaff.findOne({
      userId: new Types.ObjectId(userId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByUserId(userId: string | Types.ObjectId, isActive?: boolean): Promise<IRestaurantStaff[]> {
    const query: Record<string, any> = { userId: { $in: [new Types.ObjectId(userId.toString()), userId.toString()] } };
    if (isActive !== undefined) query.isActive = isActive;
    return RestaurantStaff.find(query);
  }

  async create(data: Partial<IRestaurantStaff>, session?: ClientSession): Promise<IRestaurantStaff> {
    const staffJoin = new RestaurantStaff(data);
    return staffJoin.save({ session });
  }

  async save(staffJoin: IRestaurantStaff, session?: ClientSession): Promise<IRestaurantStaff> {
    return staffJoin.save({ session });
  }

  async updateMany(
    filter: Record<string, any>,
    update: Record<string, any>,
    session?: ClientSession
  ): Promise<void> {
    await RestaurantStaff.updateMany(filter, update, { session });
  }

  async deactivateByUserAndRestaurant(
    userId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    await RestaurantStaff.updateMany(
      {
        userId: new Types.ObjectId(userId.toString()),
        restaurantId: new Types.ObjectId(restaurantId.toString()),
      },
      { $set: { isActive: false } },
      { session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await RestaurantStaff.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const restaurantStaffRepository = new RestaurantStaffRepository();
