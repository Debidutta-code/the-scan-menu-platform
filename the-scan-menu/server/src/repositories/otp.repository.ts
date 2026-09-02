import { Types, ClientSession } from 'mongoose';
import { OtpSession, IOtpSession } from '../models/OtpSession';

export class OtpRepository {
  async findActiveByPhoneAndRestaurant(
    phone: string,
    restaurantId: string | Types.ObjectId
  ): Promise<IOtpSession | null> {
    return OtpSession.findOne({
      phone,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  async findById(id: string | Types.ObjectId): Promise<IOtpSession | null> {
    return OtpSession.findById(id);
  }

  async create(data: Partial<IOtpSession>, session?: ClientSession): Promise<IOtpSession> {
    const otp = new OtpSession(data);
    return otp.save({ session });
  }

  async save(otp: IOtpSession, session?: ClientSession): Promise<IOtpSession> {
    return otp.save({ session });
  }

  async invalidateByPhoneAndRestaurant(phone: string, restaurantId: string | Types.ObjectId): Promise<void> {
    await OtpSession.updateMany(
      {
        phone,
        restaurantId: new Types.ObjectId(restaurantId.toString()),
        isUsed: false,
      },
      { isUsed: true }
    );
  }
}

export const otpRepository = new OtpRepository();
