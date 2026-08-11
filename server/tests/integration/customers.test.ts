import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from '../../src/index';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Table } from '../../src/models/Table';
import { Category } from '../../src/models/Category';
import { MenuItem } from '../../src/models/MenuItem';
import { User } from '../../src/models/User';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { Customer } from '../../src/models/Customer';
import { Order } from '../../src/models/Order';
import bcrypt from 'bcrypt';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Customer Auth, Order Auto-Upsert & Directory Tests', () => {
  it('should handle full customer lifecycle: OTP login, profile, order auto-linking, and manager directory', async () => {
    // 1. Setup Restaurant & Manager
    const restaurant = await Restaurant.create({
      name: 'Gourmet Bistro',
      slug: 'gourmet-bistro',
      code: 'GB01',
      theme: { primaryColor: '#000000', accentColor: '#f59e0b' },
    });

    const passwordHash = await bcrypt.hash('ManagerPass123!', 10);
    const manager = await User.create({
      name: 'Manager Bob',
      email: 'manager@gourmet.com',
      passwordHash,
      role: 'MANAGER',
      restaurantId: restaurant._id,
      isActive: true,
    });

    await RestaurantStaff.create({
      userId: manager._id,
      restaurantId: restaurant._id,
      role: 'MANAGER',
      isActive: true,
    });

    // Login Manager
    const managerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@gourmet.com', password: 'ManagerPass123!' });
    const managerToken = managerLogin.body.data.accessToken;

    // Create Category and Menu Items
    const category = await Category.create({
      restaurantId: restaurant._id,
      name: 'Mains',
      sortOrder: 1,
      isActive: true,
    });

    const menuItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Truffle Burger',
      price: 1500, // 15.00
      isAvailable: true,
    });

    await RestaurantSettings.create({
      restaurantId: restaurant._id,
      paymentConfig: { taxRatePercent: 0, paymentMethods: { cash: true }, integrationConfig: { provider: 'NONE', config: {} } },
    });

    const table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: '5',
      displayName: 'Table 5',
      token: 'table_token_5',
      qrCodeUrl: '/api/v1/restaurants/gourmet-bistro/tables/5/qr',
      isActive: true,
    });

    // 2. Customer Send OTP
    const sendOtpRes = await request(app)
      .post('/api/v1/public/customers/send-otp')
      .send({
        phone: '9876543210',
        restaurantSlug: 'gourmet-bistro',
      });

    expect(sendOtpRes.status).toBe(200);
    expect(sendOtpRes.body.success).toBe(true);
    expect(sendOtpRes.body.data.phone).toBe('9876543210');
    expect(sendOtpRes.body.data.demoOtp).toBe('1234');

    // 3. Customer Verify OTP & Login
    const verifyOtpRes = await request(app)
      .post('/api/v1/public/customers/verify-otp')
      .send({
        phone: '9876543210',
        otp: '1234',
        name: 'Alice Johnson',
        restaurantSlug: 'gourmet-bistro',
      });

    expect(verifyOtpRes.status).toBe(200);
    expect(verifyOtpRes.body.success).toBe(true);
    expect(verifyOtpRes.body.data.customer.name).toBe('Alice Johnson');
    expect(verifyOtpRes.body.data.customer.phone).toBe('9876543210');
    expect(verifyOtpRes.body.data).toHaveProperty('customerToken');

    const customerToken = verifyOtpRes.body.data.customerToken;

    // 4. Get Customer Profile
    const meRes = await request(app)
      .get('/api/v1/public/customers/me')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.customer.name).toBe('Alice Johnson');

    // 5. Update Profile
    const updateRes = await request(app)
      .patch('/api/v1/public/customers/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Alice J. Smith',
        email: 'alice@example.com',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Alice J. Smith');
    expect(updateRes.body.data.email).toBe('alice@example.com');

    // 6. Public Table Order Placement (Auto-linking customer)
    const orderRes = await request(app)
      .post(`/api/v1/public/restaurants/gourmet-bistro/tables/table_token_5/orders`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        items: [{ itemId: menuItem._id.toString(), quantity: 2, selectedAddOns: [] }],
        customerName: 'Alice J. Smith',
        customerPhone: '9876543210',
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.success).toBe(true);

    // Verify order record has customerId linked
    const placedOrder = await Order.findById(orderRes.body.data._id);
    expect(placedOrder?.customerId).toBeDefined();

    // Verify Customer record total spend & orders count were updated
    const customerInDb = await Customer.findOne({ phone: '9876543210', restaurantId: restaurant._id });
    expect(customerInDb?.totalOrdersCount).toBe(1);
    expect(customerInDb?.totalSpent).toBe(3000); // 1500 * 2

    // 7. Get Customer Order History
    const historyRes = await request(app)
      .get('/api/v1/public/customers/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.orders.length).toBe(1);
    expect(historyRes.body.data.orders[0].total).toBe(3000);

    // 8. Manager Customer Directory View
    const managerCustomersRes = await request(app)
      .get(`/api/v1/restaurants/${restaurant._id}/customers`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(managerCustomersRes.status).toBe(200);
    expect(managerCustomersRes.body.data.customers.length).toBe(1);
    expect(managerCustomersRes.body.data.customers[0].name).toBe('Alice J. Smith');
    expect(managerCustomersRes.body.data.customers[0].totalSpent).toBe(3000);
  });
});
