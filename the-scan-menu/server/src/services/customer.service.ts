import { Types } from 'mongoose';
import { ICustomer } from '../models/Customer';
import { customerRepository } from '../repositories/customer.repository';
import { orderRepository } from '../repositories/order.repository';
import { CustomError } from '../utils/response';
import { normalizeIndianPhoneNumber } from '../utils/phone';

export class CustomerService {
  /**
   * Finds or creates a customer profile by phone number for a specific restaurant tenant.
   * Updates name, email, and last seen timestamp when recognized.
   */
  async findOrCreateCustomer(
    restaurantId: Types.ObjectId | string,
    phone: string,
    name?: string,
    email?: string,
    isPhoneVerified: boolean = false
  ): Promise<ICustomer> {
    const cleanPhone = normalizeIndianPhoneNumber(phone);

    let customer = await customerRepository.findByPhoneAndRestaurant(cleanPhone, restaurantId);

    if (customer) {
      if (name && name.trim() && name.trim() !== customer.name) {
        customer.name = name.trim();
      }
      if (email && email.trim() && email.trim() !== customer.email) {
        customer.email = email.trim();
      }
      if (isPhoneVerified && !customer.isPhoneVerified) {
        customer.isPhoneVerified = true;
      }
      customer.lastSeenAt = new Date();
      await customerRepository.save(customer);
      return customer;
    }

    // Create new customer
    customer = await customerRepository.create({
      restaurantId: new Types.ObjectId(restaurantId.toString()),
      phone: cleanPhone,
      name: (name && name.trim()) ? name.trim() : 'Guest Diner',
      email: email ? email.trim() : undefined,
      isPhoneVerified: !!isPhoneVerified,
      totalOrdersCount: 0,
      totalSpent: 0,
      lastSeenAt: new Date(),
    });

    return customer;
  }

  /**
   * Updates customer aggregate metrics when an order is finalized/placed.
   */
  async recordCustomerOrder(customerId: Types.ObjectId | string, orderTotal: number): Promise<void> {
    if (!customerId) return;
    try {
      await customerRepository.updateById(customerId, {
        $inc: {
          totalOrdersCount: 1,
          totalSpent: orderTotal || 0,
        },
        $set: {
          lastOrderAt: new Date(),
          lastSeenAt: new Date(),
        },
      } as any);
    } catch (err) {
      console.error('Failed to update customer order metrics:', err);
    }
  }

  /**
   * Deducts customer aggregate metrics when an order is cancelled.
   */
  async deductCustomerOrder(customerId: Types.ObjectId | string, orderTotal: number): Promise<void> {
    if (!customerId) return;
    try {
      await customerRepository.updateById(customerId, {
        $inc: {
          totalOrdersCount: -1,
          totalSpent: -(orderTotal || 0),
        },
      } as any);
    } catch (err) {
      console.error('Failed to deduct customer order metrics:', err);
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
    const rId = new Types.ObjectId(restaurantId.toString());
    const cId = new Types.ObjectId(customerId.toString());

    const skip = (Math.max(1, page) - 1) * limit;

    const [orders, total] = await Promise.all([
      orderRepository.findByRestaurantId(rId, { customerId: cId }, { createdAt: -1 }, skip, limit),
      orderRepository.countByRestaurantId(rId, { customerId: cId }),
    ]);

    // Self-healing background sync of customer totalSpent and totalOrdersCount
    const validOrders = await orderRepository.findByRestaurantId(rId, { customerId: cId, status: { $ne: 'CANCELLED' } }, {}, 0, 10000);
    const actualSpent = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const actualCount = validOrders.length;
    customerRepository.updateById(cId, { totalSpent: actualSpent, totalOrdersCount: actualCount } as any).catch(() => {});

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
    const rId = new Types.ObjectId(restaurantId.toString());
    const filter: any = {};

    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [customers, total] = await Promise.all([
      customerRepository.findByRestaurantId(rId, filter, { lastOrderAt: -1, createdAt: -1 }, skip, limit),
      customerRepository.countByRestaurantId(rId, filter),
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
    const rId = new Types.ObjectId(restaurantId.toString());
    const cId = new Types.ObjectId(customerId.toString());

    const customer = await customerRepository.findById(cId);
    if (!customer || customer.restaurantId.toString() !== rId.toString()) {
      throw new CustomError('CUSTOMER_NOT_FOUND', 'Customer profile not found', 404);
    }

    const recentOrders = await orderRepository.findByRestaurantId(
      rId,
      { customerId: cId },
      { createdAt: -1 },
      0,
      10
    );

    return {
      customer,
      recentOrders,
    };
  }
}

export const customerService = new CustomerService();
export default customerService;
