import { Types, ClientSession } from 'mongoose';
import { Order, IOrder, OrderStatus } from '../models/Order';

export interface OrderListFilter {
  restaurantId: string | Types.ObjectId;
  status?: string;
  search?: string;
  isCleared?: boolean;
  diningSessionId?: string | Types.ObjectId;
  tableId?: string | Types.ObjectId;
  customerId?: string | Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  statuses?: string[];
}

export class OrderRepository {
  async findById(id: string | Types.ObjectId): Promise<IOrder | null> {
    return Order.findById(id);
  }

  async findByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IOrder | null> {
    return Order.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    });
  }

  async findByIdAndRestaurantWithPopulate(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId
  ): Promise<IOrder | null> {
    return Order.findOne({
      _id: new Types.ObjectId(id.toString()),
      restaurantId: new Types.ObjectId(restaurantId.toString()),
    })
      .populate('tableId', 'displayName tableNumber')
      .populate('diningSessionId', 'status sessionCode closedAt');
  }

  async findByDiningSessionId(
    diningSessionId: string | Types.ObjectId,
    filter: Record<string, any> = {}
  ): Promise<IOrder[]> {
    return Order.find({
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
      ...filter,
    }).sort({ roundNumber: 1, createdAt: 1 });
  }

  async findNonCancelledByDiningSession(diningSessionId: string | Types.ObjectId): Promise<IOrder[]> {
    return Order.find({
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
      status: { $ne: 'CANCELLED' },
    }).sort({ roundNumber: 1, createdAt: 1 });
  }

  async findByRestaurantId(
    restaurantId: string | Types.ObjectId,
    filter: Record<string, any> = {},
    sort: Record<string, any> = { createdAt: -1 },
    skip = 0,
    limit = 10
  ): Promise<IOrder[]> {
    return Order.find({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter })
      .sort(sort)
      .populate('tableId', 'displayName tableNumber')
      .populate('diningSessionId', 'status sessionCode closedAt')
      .skip(skip)
      .limit(limit);
  }

  async findActiveByRestaurantId(restaurantId: string | Types.ObjectId): Promise<IOrder[]> {
    return Order.find({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      status: { $ne: 'CANCELLED' },
      isCleared: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .populate([
        { path: 'tableId', select: 'displayName tableNumber' },
        { path: 'diningSessionId', select: 'status sessionCode closedAt' },
      ]);
  }

  async countByRestaurantId(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return Order.countDocuments({ restaurantId: new Types.ObjectId(restaurantId.toString()), ...filter });
  }

  async count(restaurantId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return this.countByRestaurantId(restaurantId, filter);
  }

  async countTotal(filter: Record<string, any> = {}): Promise<number> {
    return Order.countDocuments(filter);
  }

  async updateStatusByRestaurantId(
    restaurantId: string | Types.ObjectId,
    status: OrderStatus,
    extraFilter: Record<string, any> = {},
    session?: ClientSession
  ): Promise<void> {
    await Order.updateMany(
      { restaurantId: new Types.ObjectId(restaurantId.toString()), ...extraFilter },
      { $set: { status } },
      { session }
    );
  }

  async create(data: Partial<IOrder>, session?: ClientSession): Promise<IOrder> {
    const order = new Order(data);
    return order.save({ session });
  }

  async save(order: IOrder, session?: ClientSession): Promise<IOrder> {
    return order.save({ session });
  }

  async updateById(id: string | Types.ObjectId, data: Partial<IOrder>, session?: ClientSession): Promise<IOrder | null> {
    return Order.findByIdAndUpdate(id, data, { new: true, session });
  }

  async updateByIdAndRestaurant(
    id: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    data: Partial<IOrder>,
    session?: ClientSession
  ): Promise<IOrder | null> {
    return Order.findOneAndUpdate(
      { _id: new Types.ObjectId(id.toString()), restaurantId: new Types.ObjectId(restaurantId.toString()) },
      data,
      { new: true, session }
    );
  }

  async updateManyBySessionId(
    diningSessionId: string | Types.ObjectId,
    data: Record<string, any>,
    session?: ClientSession
  ): Promise<void> {
    await Order.updateMany(
      { diningSessionId: new Types.ObjectId(diningSessionId.toString()) },
      data,
      { session }
    );
  }

  async countByDiningSessionId(diningSessionId: string | Types.ObjectId, filter: Record<string, any> = {}): Promise<number> {
    return Order.countDocuments({
      diningSessionId: new Types.ObjectId(diningSessionId.toString()),
      ...filter,
    });
  }

  async updateStatusBySessionId(
    diningSessionId: string | Types.ObjectId,
    status: OrderStatus,
    session?: ClientSession
  ): Promise<void> {
    await Order.updateMany(
      {
        $or: [
          { diningSessionId: new Types.ObjectId(diningSessionId.toString()) },
          { sessionId: new Types.ObjectId(diningSessionId.toString()) },
        ],
        status: { $ne: 'CANCELLED' },
      },
      { $set: { status, isCleared: true, clearedAt: new Date() } },
      { session }
    );
  }

  async updatePaymentStatusBySessionId(
    diningSessionId: string | Types.ObjectId,
    paymentStatus: string,
    session?: ClientSession
  ): Promise<void> {
    await Order.updateMany(
      {
        $or: [
          { diningSessionId: new Types.ObjectId(diningSessionId.toString()) },
          { sessionId: new Types.ObjectId(diningSessionId.toString()) },
        ],
        status: { $ne: 'CANCELLED' },
      },
      { $set: { paymentStatus } },
      { session }
    );
  }

  async updateTableBySessionId(
    diningSessionId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    await Order.updateMany(
      {
        diningSessionId: new Types.ObjectId(diningSessionId.toString()),
        status: { $ne: 'CANCELLED' },
      },
      { $set: { tableId: new Types.ObjectId(tableId.toString()) } },
      { session }
    );
  }

  async updateSessionBySessionId(
    oldSessionId: string | Types.ObjectId,
    newSessionId: string | Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    await Order.updateMany(
      {
        diningSessionId: new Types.ObjectId(oldSessionId.toString()),
        status: { $ne: 'CANCELLED' },
      },
      { $set: { diningSessionId: new Types.ObjectId(newSessionId.toString()) } },
      { session }
    );
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return Order.aggregate(pipeline);
  }

  async deleteByRestaurantId(restaurantId: string | Types.ObjectId, session?: ClientSession): Promise<void> {
    await Order.deleteMany({ restaurantId: new Types.ObjectId(restaurantId.toString()) }, { session });
  }
}

export const orderRepository = new OrderRepository();
