import { Types, ClientSession } from 'mongoose';
import { GuestSession, IGuestSession } from '../models/GuestSession';

export class GuestSessionRepository {
  async findByToken(guestToken: string): Promise<IGuestSession | null> {
    return GuestSession.findOne({ guestToken });
  }

  async findByTokenAndDiningSession(
    guestToken: string,
    diningSessionId: string | Types.ObjectId
  ): Promise<IGuestSession | null> {
    return GuestSession.findOne({
      guestToken,
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
    });
  }

  async findByDiningSessionId(diningSessionId: string | Types.ObjectId): Promise<IGuestSession[]> {
    return GuestSession.find({ diningSessionId: new Types.ObjectId(diningSessionId.toString()) });
  }

  async create(data: Partial<IGuestSession>, session?: ClientSession): Promise<IGuestSession> {
    const guestSession = new GuestSession(data);
    return guestSession.save({ session });
  }

  async save(guestSession: IGuestSession, session?: ClientSession): Promise<IGuestSession> {
    return guestSession.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IGuestSession>, session?: ClientSession): Promise<IGuestSession | null> {
    return GuestSession.findByIdAndUpdate(id, data, { new: true, session });
  }

  async deleteByDiningSessionId(diningSessionId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await GuestSession.deleteMany({ diningSessionId: new Types.ObjectId(diningSessionId.toString()) }, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await GuestSession.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const guestSessionRepository = new GuestSessionRepository();
