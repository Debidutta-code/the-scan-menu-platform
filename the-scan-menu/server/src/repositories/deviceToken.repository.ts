import { Types, ClientSession } from 'mongoose';
import { DeviceToken, IDeviceToken } from '../models/DeviceToken';

export class DeviceTokenRepository {
  async findByUserId(userId: string | Types.ObjectId, isActive = true): Promise<IDeviceToken[]> {
    return DeviceToken.find({ userId: new Types.ObjectId(userId.toString()), isActive });
  }

  async findByRestaurantId(restaurantId: string | Types.ObjectId, isActive = true): Promise<IDeviceToken[]> {
    return DeviceToken.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), isActive });
  }

  async findByToken(token: string): Promise<IDeviceToken | null> {
    return DeviceToken.findOne({ token });
  }

  async upsertByUserAndToken(
    userId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    token: string,
    data: Partial<IDeviceToken>,
    session?: ClientSession
  ): Promise<IDeviceToken> {
    return DeviceToken.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()), token },
      { $set: { restaurantId: new Types.ObjectId(restaurantId.toString()), ...data, isActive: true, lastActiveAt: new Date() } },
      { upsert: true, new: true, session }
    ) as unknown as IDeviceToken;
  }

  async save(doc: IDeviceToken, session?: ClientSession): Promise<IDeviceToken> {
    return doc.save({ session });
  }

  async deactivateByUserId(userId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await DeviceToken.updateMany(
      { userId: new Types.ObjectId(userId.toString()) },
      { isActive: false },
      { session }
    );
  }

  async deactivateByToken(token: string, session?: ClientSession): Promise<void> {
    await DeviceToken.updateOne({ token: token.trim() }, { isActive: false }, { session });
  }

  async deactivateByTokens(tokens: string[], session?: ClientSession): Promise<void> {
    await DeviceToken.updateMany({ token: { $in: tokens } }, { isActive: false }, { session });
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await DeviceToken.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const deviceTokenRepository = new DeviceTokenRepository();
