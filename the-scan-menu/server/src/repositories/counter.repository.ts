import { ClientSession } from 'mongoose';
import { Counter } from '../models/Counter';

export class CounterRepository {
  async getNextSequence(name: string, session?: ClientSession): Promise<number> {
    const result = await Counter.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    if (!result) throw new Error(`Failed to increment counter ${name}`);
    return result.seq;
  }
}

export const counterRepository = new CounterRepository();
