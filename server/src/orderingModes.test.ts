import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from './index';
import { Restaurant } from './models/Restaurant';
import { RestaurantSettings } from './models/RestaurantSettings';
import { User } from './models/User';
import { Table } from './models/Table';
import { Category } from './models/Category';
import { MenuItem } from './models/MenuItem';
import { Order } from './models/Order';
import { FeatureFlag } from './models/FeatureFlag';
import { RestaurantStaff } from './models/RestaurantStaff';
import { migratePhase8 } from './utils/migratePhase8';

let mongoServer: MongoMemoryServer;
let adminAccessToken: string;
let staffAccessToken: string;
let restaurantId: mongoose.Types.ObjectId;
let restaurantSlug: string;
let tableToken: string;
let menuItemId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Setup Restaurant
  const restaurant = await Restaurant.create({
    code: 'TEST-MODE',
    name: 'Modes Bistro',
    slug: 'modes-bistro',
    status: 'ACTIVE',
  });
  restaurantId = restaurant._id as mongoose.Types.ObjectId;
  restaurantSlug = restaurant.slug;

  await RestaurantSettings.create({
    restaurantId,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    paymentConfig: { activeProvider: 'CASH', activeMode: 'POSTPAID', taxRatePercent: 0 },
  });

  const table = await Table.create({
    restaurantId,
    tableNumber: 'T1',
    displayName: 'Table 1',
    token: 'test_table_token_mode_123',
    isActive: true,
    qrCodeUrl: '/test.svg',
  });
  tableToken = table.token;

  const category = await Category.create({
    restaurantId,
    name: 'Main Course',
    sortOrder: 1,
    isActive: true,
  });

  const menuItem = await MenuItem.create({
    restaurantId,
    categoryId: category._id,
    name: 'Artisan Burger',
    price: 1500, // 15.00 INR in paise
    isAvailable: true,
    sortOrder: 1,
  });
  menuItemId = menuItem._id as mongoose.Types.ObjectId;

  const admin = await User.create({
    name: 'Manager User',
    email: 'manager@modes.com',
    passwordHash: 'hashed',
    role: 'MANAGER',
    restaurants: [restaurantId],
  });

  const staff = await User.create({
    name: 'Staff User',
    email: 'staff@modes.com',
    passwordHash: 'hashed',
    role: 'STAFF',
    restaurants: [restaurantId],
  });

  await RestaurantStaff.create({
    restaurantId,
    userId: admin._id,
    role: 'MANAGER',
    isActive: true,
  });

  await RestaurantStaff.create({
    restaurantId,
    userId: staff._id,
    role: 'STAFF',
    isActive: true,
  });

  const TEST_JWT_SECRET = 'test_access_secret_key_123_abc_456_def';
  adminAccessToken = jwt.sign(
    { id: (admin._id as any).toString(), email: admin.email, role: admin.role },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
  staffAccessToken = jwt.sign(
    { id: (staff._id as any).toString(), email: staff.email, role: staff.role },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );

  await FeatureFlag.create({
    restaurantId,
    key: 'ordering',
    enabled: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

beforeEach(async () => {
  await Order.deleteMany({});
});

describe('Phase 8 Ordering Modes Expansion Tests', () => {
  it('Dine-In order creation sets orderMode: DINE_IN explicitly (Regression Check)', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/${restaurantSlug}/tables/${tableToken}/orders`)
      .send({
        items: [{ itemId: menuItemId.toString(), quantity: 2 }],
        customerName: 'Dine-In Guest',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderMode).toBe('DINE_IN');
    expect(res.body.data.tableId).toBeDefined();

    const dbOrder = await Order.findById(res.body.data._id);
    expect(dbOrder).toBeDefined();
    expect(dbOrder?.orderMode).toBe('DINE_IN');
  });

  it('Sessionless Takeaway order creation succeeds and sets orderMode: TAKEAWAY', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/${restaurantSlug}/orders`)
      .send({
        orderMode: 'TAKEAWAY',
        customerName: 'Takeaway John',
        customerPhone: '9876543210',
        items: [{ itemId: menuItemId.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderMode).toBe('TAKEAWAY');
    expect(res.body.data.customerName).toBe('Takeaway John');
    expect(res.body.data.tableId).toBeUndefined();
  });

  it('Takeaway order creation fails if customerName or customerPhone is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/${restaurantSlug}/orders`)
      .send({
        orderMode: 'TAKEAWAY',
        customerName: '',
        customerPhone: '',
        items: [{ itemId: menuItemId.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Customer name is required');
  });

  it('Sessionless Delivery order creation succeeds and sets orderMode: DELIVERY', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/${restaurantSlug}/orders`)
      .send({
        orderMode: 'DELIVERY',
        customerName: 'Delivery Alice',
        customerPhone: '9876543210',
        deliveryAddress: { street: '123 Main St', city: 'Metropolis', zipCode: '10001' },
        items: [{ itemId: menuItemId.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderMode).toBe('DELIVERY');
    expect(res.body.data.deliveryAddress).toBeDefined();
    expect(res.body.data.tableId).toBeUndefined();
  });

  it('Delivery order creation fails if deliveryAddress is missing', async () => {
    const res = await request(app)
      .post(`/api/v1/public/restaurants/${restaurantSlug}/orders`)
      .send({
        orderMode: 'DELIVERY',
        customerName: 'Delivery Alice',
        customerPhone: '9876543210',
        items: [{ itemId: menuItemId.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Delivery address is required');
  });

  it('Counter order creation via staff API succeeds and sets orderMode: COUNTER and paymentStatus: PAID', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurants/${restaurantId}/orders/counter`)
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .send({
        customerName: 'Walk-in Customer',
        items: [{ itemId: menuItemId.toString(), quantity: 3 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderMode).toBe('COUNTER');
    expect(res.body.data.paymentStatus).toBe('PAID');
    expect(res.body.data.source).toBe('POS');
  });

  it('Counter order creation fails for unauthenticated user', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurants/${restaurantId}/orders/counter`)
      .send({
        customerName: 'Walk-in Customer',
        items: [{ itemId: menuItemId.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(401);
  });

  it('Idempotent migration script backfills orderMode: DINE_IN on unmigrated legacy orders', async () => {
    // Create legacy order directly using MongoDB collection without orderMode field
    await Order.collection.insertOne({
      restaurantId,
      tableId: new mongoose.Types.ObjectId(),
      sessionId: new mongoose.Types.ObjectId(),
      orderNumber: 999,
      items: [],
      subtotal: 1000,
      tax: 0,
      total: 1000,
      status: 'PENDING',
      source: 'QR',
      paymentStatus: 'PENDING',
      integrationMetadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const unmigratedBefore = await Order.countDocuments({ orderMode: { $exists: false } });
    expect(unmigratedBefore).toBe(1);

    const updatedFirstRun = await migratePhase8();
    expect(updatedFirstRun).toBe(1);

    const unmigratedAfter = await Order.countDocuments({ orderMode: { $exists: false } });
    expect(unmigratedAfter).toBe(0);

    // Second run: idempotent check
    const updatedSecondRun = await migratePhase8();
    expect(updatedSecondRun).toBe(0);
  });

  it('listActiveOrders is mode-aware and includes counter orders immediately', async () => {
    // Create a counter order
    await request(app)
      .post(`/api/v1/restaurants/${restaurantId}/orders/counter`)
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .send({
        customerName: 'Walk-in Counter',
        items: [{ itemId: menuItemId.toString(), quantity: 1 }],
      });

    const res = await request(app)
      .get(`/api/v1/restaurants/${restaurantId}/orders/active`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].orderMode).toBe('COUNTER');
  });
});
