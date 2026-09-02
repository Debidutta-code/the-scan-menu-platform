import { Types, ClientSession } from 'mongoose';
import { BillCounter, IBillCounter } from '../models/BillCounter';

export class BillCounterRepository {
  async getNextSequence(restaurantId: string | Types.ObjectId, year: number, session?: ClientSession): Promise<number> {
    const counter = await BillCounter.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()), year },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    return counter!.seq;
  }

  async updateMaxSeq(restaurantId: string | Types.ObjectId, year: number, maxSeq: number): Promise<IBillCounter | null> {
    return BillCounter.findOneAndUpdate(
      { restaurantId: new Types.ObjectId(restaurantId.toString()), year },
      { $max: { seq: maxSeq + 1 } },
      { new: true }
    );
  }
}

export const billCounterRepository = new BillCounterRepository();
