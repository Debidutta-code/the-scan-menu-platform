import { Types, ClientSession } from 'mongoose';
import { Payment, IPayment, PaymentStatus } from '../models/Payment';

export class PaymentRepository {
  async findById(id: string | Types.ObjectId): Promise<IPayment | null> {
    return Payment.findById(id);
  }

  async findByIdAndRestaurant(id: string | Types.ObjectId, restaurantId: string | Types.ObjectId): Promise<IPayment | null> {
    return Payment.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByOrderId(orderId: string | Types.ObjectId): Promise<IPayment | null> {
    return Payment.findOne({ orderId: new Types.ObjectId(orderId.toString()) });
  }

  async findByProviderReferenceId(providerReferenceId: string): Promise<IPayment | null> {
    return Payment.findOne({ providerReferenceId });
  }

  async findByCheckoutAttemptId(checkoutAttemptId: string | Types.ObjectId): Promise<IPayment[]> {
    return Payment.find({ checkoutAttemptId: new Types.ObjectId(checkoutAttemptId.toString()) });
  }

  async findByDiningSessionId(diningSessionId: string | Types.ObjectId): Promise<IPayment[]> {
    return Payment.find({ diningSessionId: new Types.ObjectId(diningSessionId.toString()) });
  }

  async findCapturedByDiningSessionId(diningSessionId: string | Types.ObjectId): Promise<IPayment[]> {
    return Payment.find({
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
      status: 'CAPTURED',
    });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<IPayment[]> {
    return Payment.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return Payment.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async create(data: Partial<IPayment>, session?: ClientSession): Promise<IPayment> {
    const payment = new Payment(data);
    return payment.save({ session });
  }

  async save(payment: IPayment, session?: ClientSession): Promise<IPayment> {
    return payment.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IPayment>, session?: ClientSession): Promise<IPayment | null> {
    return Payment.findByIdAndUpdate(id, data, { new: true, session });
  }

  async findTransactionsWithPopulate(
    query: Record<string, any>,
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 20
  ): Promise<any[]> {
    return Payment.find(query)
      .sort(sort)
      .populate([
        {
          path: 'orderId',
          select: 'orderNumber orderMode customerName customerPhone items total subtotal tax status paymentStatus tableId createdAt',
          populate: { path: 'tableId', select: 'displayName tableNumber' },
        },
        {
          path: 'diningSessionId',
          select: 'sessionCode tableId status',
          populate: { path: 'tableId', select: 'displayName tableNumber' },
        },
        { path: 'billId', select: 'billNumber netAmount balanceDue discountAmount' },
      ])
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findOneWithPopulate(query: Record<string, any>): Promise<IPayment | null> {
    return Payment.findOne(query).populate([
      {
        path: 'orderId',
        select: 'orderNumber orderMode customerName customerPhone items total subtotal tax status paymentStatus tableId createdAt',
        populate: { path: 'tableId', select: 'displayName tableNumber' },
      },
      {
        path: 'diningSessionId',
        select: 'sessionCode tableId status',
        populate: { path: 'tableId', select: 'displayName tableNumber' },
      },
      { path: 'billId', select: 'billNumber netAmount balanceDue discountAmount' },
    ]);
  }

  async aggregateSummary(restaurantId: string | Types.ObjectId): Promise<any> {
    return Payment.aggregate([
      { $match: { restaurantId: new Types.ObjectId(restaurantId.toString()) } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'CAPTURED'] }, '$amount', 0] },
          },
          capturedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'CAPTURED'] }, 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] },
          },
        },
      },
    ]);
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Payment.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const paymentRepository = new PaymentRepository();
