import { Types, ClientSession } from 'mongoose';
import { CheckoutAttempt, ICheckoutAttempt, CheckoutAttemptStatus } from '../models/CheckoutAttempt';

export class CheckoutAttemptRepository {
  async findById(id: string | Types.ObjectId): Promise<ICheckoutAttempt | null> {
    return CheckoutAttempt.findById(id);
  }

  async findByIdempotencyKey(key: string, restaurantId: string | Types.ObjectId): Promise<ICheckoutAttempt | null> {
    return CheckoutAttempt.findOne({
      idempotencyKey: key,
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByGatewayOrderId(gatewayOrderId: string): Promise<ICheckoutAttempt | null> {
    return CheckoutAttempt.findOne({ gatewayOrderId });
  }

  async create(data: Partial<ICheckoutAttempt>, session?: ClientSession): Promise<ICheckoutAttempt> {
    const attempt = new CheckoutAttempt(data);
    return attempt.save({ session });
  }

  async save(attempt: ICheckoutAttempt, session?: ClientSession): Promise<ICheckoutAttempt> {
    return attempt.save({ session });
  }

  async findByIdempotencyKeyOnly(key: string): Promise<ICheckoutAttempt | null> {
    return CheckoutAttempt.findOne({ idempotencyKey: key });
  }

  async lockPending(id: string | Types.ObjectId, gatewayPaymentId: string): Promise<ICheckoutAttempt | null> {
    return CheckoutAttempt.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()), status: 'PAYMENT_PENDING' },
      { $set: { status: 'PAYMENT_SUCCESS', gatewayPaymentId } },
      { new: true }
    );
  }

  async updateById(id: string | Types.ObjectId, data: Partial<ICheckoutAttempt>, session?: ClientSession): Promise<ICheckoutAttempt | null> {
    return CheckoutAttempt.findByIdAndUpdate(id, data, { new: true, session });
  }
}

export const checkoutAttemptRepository = new CheckoutAttemptRepository();
