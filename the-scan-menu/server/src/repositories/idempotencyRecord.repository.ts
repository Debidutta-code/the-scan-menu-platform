import { Types, ClientSession } from 'mongoose';
import { IdempotencyRecord, IIdempotencyRecord } from '../models/IdempotencyRecord';

export class IdempotencyRecordRepository {
  async findByKeyAndRestaurant(key: string, restaurantId: string | Types.ObjectId): Promise<IIdempotencyRecord | null> {
    return IdempotencyRecord.findOne({
      key,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async create(data: Partial<IIdempotencyRecord>, session?: ClientSession): Promise<IIdempotencyRecord> {
    const record = new IdempotencyRecord(data);
    return record.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IIdempotencyRecord>, session?: ClientSession): Promise<IIdempotencyRecord | null> {
    return IdempotencyRecord.findByIdAndUpdate(id, data, { new: true, session });
  }

  async upsert(
    key: string,
    restaurantId: string | Types.ObjectId,
    data: Partial<IIdempotencyRecord>,
    session?: ClientSession
  ): Promise<IIdempotencyRecord> {
    return IdempotencyRecord.findOneAndUpdate(
      { key, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $setOnInsert: data },
      { upsert: true, new: true, session }
    ) as unknown as IIdempotencyRecord;
  }

  async updateByKeyAndRestaurant(
    key: string,
    restaurantId: string | Types.ObjectId,
    data: Partial<IIdempotencyRecord>,
    session?: ClientSession
  ): Promise<IIdempotencyRecord | null> {
    return IdempotencyRecord.findOneAndUpdate(
      { key, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { $set: data },
      { new: true, session }
    );
  }

  async deleteByKeyAndRestaurant(
    key: string,
    restaurantId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    await IdempotencyRecord.deleteOne(
      { key, restaurantId: new Types.ObjectId(restaurantId.toString()) },
      { session }
    );
  }
}

export const idempotencyRecordRepository = new IdempotencyRecordRepository();
