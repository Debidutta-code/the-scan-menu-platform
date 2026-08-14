import { ClientSession } from 'mongoose';
import { Counter } from '../models/Counter';

export class CounterService {
  /**
   * Atomically gets the next sequence number formatted for a given counter.
   * Example: RST-000001
   */
  async getNextSequence(name: string, prefix = 'RST-', digits = 6, session?: ClientSession): Promise<string> {
    const options = { new: true, upsert: true, session };
    const result = await Counter.findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      options
    );

    if (!result) {
      throw new Error(`Failed to increment counter ${name}`);
    }

    const seqString = String(result.seq).padStart(digits, '0');
    return `${prefix}${seqString}`;
  }
}

export const counterService = new CounterService();
export default counterService;
