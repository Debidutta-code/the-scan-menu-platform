import { Types, ClientSession } from 'mongoose';
import { Table, ITable } from '../models/Table';

export class TableRepository {
  async findById(id: string | Types.ObjectId): Promise<ITable | null> {
    return Table.findById(id);
  }

  async findByToken(token: string): Promise<ITable | null> {
    return Table.findOne({ token });
  }

  async findByTokenAndRestaurant(token: string, restaurantId: string | Types.ObjectId): Promise<ITable | null> {
    return Table.findOne({ token, restaurantId: new Types.ObjectId(restaurantId.toString()) });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filterOrIncludeArchived: Record<string, any> | boolean = false
  ): Promise<ITable[]> {
    let query: Record<string, any> = { restaurantId: new Types.ObjectId(restaurantId.toString()) };
    if (typeof filterOrIncludeArchived === 'boolean') {
      if (!filterOrIncludeArchived) {
        query.isArchived = { $ne: true };
      }
    } else {
      query = { ...query, ...filterOrIncludeArchived };
    }
    return Table.find(query).sort({ tableNumber: 1 });
  }

  async findActiveByRestaurantId(restaurantId: string | Types.ObjectId): Promise<ITable[]> {
    return Table.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isActive: true,
      isArchived: { $ne: true },
    }).sort({ tableNumber: 1 });
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<ITable | null> {
    return Table.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async create(data: Partial<ITable>, session?: ClientSession): Promise<ITable> {
    const table = new Table(data);
    return table.save({ session });
  }

  async insertMany(tables: Partial<ITable>[], session?: ClientSession): Promise<ITable[]> {
    return Table.insertMany(tables, { session }) as unknown as ITable[];
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ITable>, session?: ClientSession): Promise<ITable | null> {
    return Table.findByIdAndUpdate(id, data, { new: true, session });
  }

  async updateByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    data: Partial<ITable>,
    session?: ClientSession
  ): Promise<ITable | null> {
    return Table.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()), restaurantId: new Types.ObjectId(restaurantId.toString()) },
      data,
      { new: true, session }
    );
  }

  async save(table: ITable, session?: ClientSession): Promise<ITable> {
    return table.save({ session });
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId): Promise<number> {
    return Table.countDocuments({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isArchived: { $ne: true },
    });
  }

  async updateManyByRestaurantId(
    restaurantId: string | Types.ObjectId,
    data: Record<string, any>,
    session?: ClientSession
  ): Promise<void> {
    await Table.updateMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, data, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Table.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }

  async find(query: Record<string, any>, populate?: string): Promise<ITable[]> {
    let q = Table.find(query);
    if (populate) {
      q = q.populate(populate);
    }
    return q;
  }

  async findOne(query: Record<string, any>): Promise<ITable | null> {
    return Table.findOne(query);
  }

  async findOneAndDelete(query: Record<string, any>): Promise<ITable | null> {
    return Table.findOneAndDelete(query);
  }

  async findOneAndUpdate(query: Record<string, any>, update: Record<string, any>, options: Record<string, any> = { new: true }): Promise<ITable | null> {
    return Table.findOneAndUpdate(query, update, options);
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>, session?: ClientSession): Promise<void> {
    await Table.updateMany(filter, update, { session });
  }

  async deleteMany(filter: Record<string, any>, session?: ClientSession): Promise<void> {
    await Table.deleteMany(filter, { session });
  }
}

export const tableRepository = new TableRepository();
