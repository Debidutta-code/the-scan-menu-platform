import { Types, ClientSession } from 'mongoose';
import { CustomizationGroup, ICustomizationGroup } from '../models/CustomizationGroup';

export class CustomizationGroupRepository {
  async findById(id: string | Types.ObjectId): Promise<ICustomizationGroup | null> {
    return CustomizationGroup.findById(id);
  }

  async findByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<ICustomizationGroup | null> {
    return CustomizationGroup.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 }
  ): Promise<ICustomizationGroup[]> {
    return CustomizationGroup.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      ...filter,
    }).sort(sort);
  }

  async create(data: Partial<ICustomizationGroup>, session?: ClientSession): Promise<ICustomizationGroup> {
    const group = new CustomizationGroup(data);
    return group.save({ session });
  }

  async update(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    updateData: Partial<ICustomizationGroup>,
    session?: ClientSession
  ): Promise<ICustomizationGroup | null> {
    return CustomizationGroup.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id.toString()),
        restaurantId: new Types.ObjectId(restaurantId.toString()),
      },
      { $set: updateData },
      { new: true, runValidators: true, session }
    );
  }

  async save(group: ICustomizationGroup, session?: ClientSession): Promise<ICustomizationGroup> {
    return group.save({ session });
  }

  async delete(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<boolean> {
    const result = await CustomizationGroup.deleteOne(
      {
        _id: new Types.ObjectId(id.toString()),
        restaurantId: new Types.ObjectId(restaurantId.toString()),
      },
      { session }
    );
    return result.deletedCount > 0;
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await CustomizationGroup.deleteMany(
      { restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { session }
    );
  }
}

export const customizationGroupRepository = new CustomizationGroupRepository();
