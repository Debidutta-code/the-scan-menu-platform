import { ClientSession } from 'mongoose';
import { counterRepository } from '../repositories/counter.repository';

export class CounterService {
  /**
   * Atomically gets the next sequence number formatted for a given counter.
   * Example: RST-000001
   */
  async getNextSequence(name: string, prefix = 'RST-', digits = 6, session?: ClientSession): Promise<string> {
    const seq = await counterRepository.getNextSequence(name, session);
    const seqString = String(seq).padStart(digits, '0');
    return `${prefix}${seqString}`;
  }
}

export const counterService = new CounterService();
export default counterService;
