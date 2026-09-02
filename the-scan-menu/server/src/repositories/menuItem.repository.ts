import { Types, ClientSession } from 'mongoose';
import { MenuItem, IMenuItem } from '../models/MenuItem';
import { CustomizationGroup, ICustomizationGroup } from '../models/CustomizationGroup';

export class MenuItemRepository {
  async findById(id: string | Types.ObjectId): Promise<IMenuItem | null> {
    return MenuItem.findById(id);
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<IMenuItem | null> {
    return MenuItem.findOne({
      _id: id,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { sortOrder: 1 }
  ): Promise<IMenuItem[]> {
    return MenuItem.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .populate('categoryId', 'name sortOrder')
      .sort(sort);
  }

  async findAvailableByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IMenuItem[]> {
    return MenuItem.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isAvailable: true,
      isDraft: false,
      isArchived: false,
    }).populate('categoryId', 'name sortOrder').sort({ sortOrder: 1 });
  }

  async findByRestaurantIdWithPopulate(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {}
  ): Promise<IMenuItem[]> {
    return MenuItem.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .populate('categoryId', 'name sortOrder')
      .sort({ sortOrder: 1 });
  }

  async findByCategoryAndRestaurant(
    categoryId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IMenuItem[]> {
    return MenuItem.find({
      categoryId: new Types.ObjectId(categoryId.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    }).sort({ sortOrder: 1 });
  }

  async findMaxSortOrderInCategory(
    restaurantId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId
  ): Promise<IMenuItem | null> {
    return MenuItem.findOne({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      categoryId: new Types.ObjectId(categoryId.toString()),
    }).sort({ sortOrder: -1 });
  }

  async countByRestaurantAndCategory(
    restaurantId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId
  ): Promise<number> {
    return MenuItem.countDocuments({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      categoryId: new Types.ObjectId(categoryId.toString()),
    });
  }

  async create(data: Partial<IMenuItem>, session?: ClientSession): Promise<IMenuItem> {
    const item = new MenuItem(data);
    return item.save({ session });
  }

  async save(item: IMenuItem, session?: ClientSession): Promise<IMenuItem> {
    return item.save({ session });
  }

  async insertMany(items: Partial<IMenuItem>[], session?: ClientSession): Promise<IMenuItem[]> {
    return MenuItem.insertMany(items, { session }) as unknown as IMenuItem[];
  }

  async findOneAndDelete(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<IMenuItem | null> {
    return MenuItem.findOneAndDelete(
      { _id: id, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { session }
    );
  }

  async updateMany(
    filter: Record<string, any>,
    update: Record<string, any>,
    session?: ClientSession
  ): Promise<void> {
    await MenuItem.updateMany(filter, update, { session });
  }

  async bulkUpdateSortOrder(
    restaurantId: string | Types.ObjectId,
    categoryId: string | Types.ObjectId,
    itemIds: string[],
    session?: ClientSession
  ): Promise<void> {
    const bulkOps = itemIds.map((id: string, index: number) => ({
      updateOne: {
        filter: {
          _id: new Types.ObjectId(id),
          categoryId: new Types.ObjectId(categoryId.toString()),
          restaurantId: new Types.ObjectId(restaurantId.toString()),
        },
        update: { sortOrder: index },
      },
    }));
    await MenuItem.bulkWrite(bulkOps, { session });
  }

  async bulkUpdateAvailability(
    objectIds: Types.ObjectId[],
    restaurantId: string | Types.ObjectId,
    isAvailable: boolean,
    session?: ClientSession
  ): Promise<void> {
    await MenuItem.updateMany(
      { _id: { $in: objectIds }, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { isAvailable },
      { session }
    );
  }

  async updateByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    data: Partial<IMenuItem>,
    session?: ClientSession
  ): Promise<IMenuItem | null> {
    return MenuItem.findOneAndUpdate(
      { _id: id, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      data,
      { new: true, session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await MenuItem.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export class CustomizationGroupRepository {
  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {}
  ): Promise<ICustomizationGroup[]> {
    return CustomizationGroup.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isArchived: false,
      ...filter,
    }).sort({ createdAt: -1 });
  }

  async findById(id: string | Types.ObjectId): Promise<ICustomizationGroup | null> {
    return CustomizationGroup.findById(id);
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<ICustomizationGroup | null> {
    return CustomizationGroup.findOne({
      _id: id,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isArchived: false,
    });
  }

  async create(data: Partial<ICustomizationGroup>, session?: ClientSession): Promise<ICustomizationGroup> {
    const group = new CustomizationGroup(data);
    return group.save({ session });
  }

  async save(group: ICustomizationGroup, session?: ClientSession): Promise<ICustomizationGroup> {
    return group.save({ session });
  }

  async archiveByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<ICustomizationGroup | null> {
    return CustomizationGroup.findOneAndUpdate(
      { _id: id, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { isArchived: true },
      { new: true, session }
    );
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await CustomizationGroup.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const menuItemRepository = new MenuItemRepository();
export const customizationGroupRepository = new CustomizationGroupRepository();
