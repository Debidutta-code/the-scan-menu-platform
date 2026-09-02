import { Types, ClientSession } from 'mongoose';
import { Category, ICategory } from '../models/Category';

export class CategoryRepository {
  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { sortOrder: 1 }
  ): Promise<ICategory[]> {
    return Category.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter }).sort(sort);
  }

  async findActiveByRestaurantId(restaurantId: string | Types.ObjectId): Promise<ICategory[]> {
    return Category.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isActive: true,
    }).sort({ sortOrder: 1 });
  }

  async findById(id: string | Types.ObjectId): Promise<ICategory | null> {
    return Category.findById(id);
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<ICategory | null> {
    return Category.findOne({
      _id: id,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findMaxSortOrder(restaurantId: string | Types.ObjectId): Promise<ICategory | null> {
    return Category.findOne({ restaurantId: new Types.ObjectId(restaurantId.toString()) }).sort({ sortOrder: -1 });
  }

  async create(data: Partial<ICategory>, session?: ClientSession): Promise<ICategory> {
    const category = new Category(data);
    return category.save({ session });
  }

  async save(category: ICategory, session?: ClientSession): Promise<ICategory> {
    return category.save({ session });
  }

  async updateByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    data: Partial<ICategory>,
    session?: ClientSession
  ): Promise<ICategory | null> {
    return Category.findOneAndUpdate(
      { _id: id, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      data,
      { new: true, session }
    );
  }

  async deleteById(id: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Category.findByIdAndDelete(id, { session });
  }

  async bulkUpdateSortOrder(
    restaurantId: string | Types.ObjectId,
    categoryOrder: string[],
    session?: ClientSession
  ): Promise<void> {
    const bulkOps = categoryOrder.map((id: string, index: number) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(id),
          restaurantId: new Types.ObjectId(restaurantId.toString()),
        },
        update: { $set: { sortOrder: index } },
      },
    }));
    await Category.bulkWrite(bulkOps, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Category.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const categoryRepository = new CategoryRepository();
