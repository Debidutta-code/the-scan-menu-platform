import mongoose, { Types } from 'mongoose';
import { Customer, ICustomer } from '../models/Customer';
import { Order } from '../models/Order';
import { CustomError } from '../utils/response';

export class CustomerService {
  /**
   * Finds or creates a customer profile by phone number for a specific restaurant tenant.
   * Updates name, email, and last seen timestamp when recognized.
   */
  async findOrCreateCustomer(
    restaurantId: Types.ObjectId | string,
    phone: string,
    name?: string,
    email?: string
  ): Promise<ICustomer> {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      throw new CustomError('BAD_REQUEST', 'Phone number is required', 400);
    }

    const rId = new Types.ObjectId(restaurantId);

    let customer = await Customer.findOne({
      restaurantId: rId,
      phone: cleanPhone,
    });

    if (customer) {
      let isModified = false;
      if (name && name.trim() && name.trim() !== customer.name) {
        customer.name = name.trim();
        isModified = true;
      }
      if (email && email.trim() && email.trim() !== customer.email) {
        customer.email = email.trim();
        isModified = true;
      }
      customer.lastSeenAt = new Date();
      await customer.save();
      return customer;
    }

    // Create new customer
    customer = new Customer({
      restaurantId: rId,
      phone: cleanPhone,
      name: (name && name.trim()) ? name.trim() : 'Guest Diner',
      email: email ? email.trim() : undefined,
      totalOrdersCount: 0,
      totalSpent: 0,
      lastSeenAt: new Date(),
    });

    await customer.save();
    return customer;
  }

  /**
   * Updates customer aggregate metrics when an order is finalized/placed.
   */
  async recordCustomerOrder(customerId: Types.ObjectId | string, orderTotal: number): Promise<void> {
    if (!customerId) return;
    try {
      await Customer.findByIdAndUpdate(customerId, {
        $inc: {
          totalOrdersCount: 1,
          totalSpent: orderTotal || 0,
        },
        $set: {
          lastOrderAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    } catch (err) {
      console.error('Failed to update customer order metrics:', err);
    }
  }

  /**
   * Retrieves order history for a verified customer.
   */
  async getCustomerOrderHistory(
    restaurantId: Types.ObjectId | string,
    customerId: Types.ObjectId | string,
    page = 1,
    limit = 20
  ) {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);

    const skip = (Math.max(1, page) - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ restaurantId: rId, customerId: cId })
        .populate('tableId', 'displayName tableNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments({ restaurantId: rId, customerId: cId }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lists customers for a restaurant with search and pagination (Manager view).
   */
  async listRestaurantCustomers(
    restaurantId: Types.ObjectId | string,
    search?: string,
    page = 1,
    limit = 50
  ) {
    const rId = new Types.ObjectId(restaurantId);
    const query: any = { restaurantId: rId };

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ lastOrderAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single customer's full profile and stats.
   */
  async getCustomerDetails(restaurantId: Types.ObjectId | string, customerId: Types.ObjectId | string) {
    const rId = new Types.ObjectId(restaurantId);
    const cId = new Types.ObjectId(customerId);

    const customer = await Customer.findOne({ _id: cId, restaurantId: rId });
    if (!customer) {
      throw new CustomError('CUSTOMER_NOT_FOUND', 'Customer profile not found', 404);
    }

    const recentOrders = await Order.find({ restaurantId: rId, customerId: cId })
      .populate('tableId', 'displayName tableNumber')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      customer,
      recentOrders,
    };
  }
}

export const customerService = new CustomerService();
export default customerService;
