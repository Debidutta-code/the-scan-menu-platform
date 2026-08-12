import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from '../../src/index';
import { Restaurant } from '../../src/models/Restaurant';
import { Table } from '../../src/models/Table';
import { Category } from '../../src/models/Category';
import { MenuItem } from '../../src/models/MenuItem';
import { Customer } from '../../src/models/Customer';
import { Order } from '../../src/models/Order';
import { DiningSession } from '../../src/models/DiningSession';
import { OtpSession } from '../../src/models/OtpSession';
import { IdempotencyRecord } from '../../src/models/IdempotencyRecord';
import { TokenService } from '../../src/services/token.service';

const tokenService = new TokenService();
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

describe('Phase 1: Security, Identity & Public API Hardening Tests', () => {
  it('1. SHARED TABLE: multiple diners at same table see all orders, while phone numbers of other diners are redacted', async () => {
    // Setup Restaurant and Table
    const restaurant = await Restaurant.create({
      name: 'Spice Garden',
      slug: 'spice-garden',
      code: 'SG01',
    });

    const table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: '12',
      displayName: 'Table 12',
      token: 'table_token_12',
      qrCodeUrl: '/qr/12',
      isActive: true,
    });

    const category = await Category.create({
      restaurantId: restaurant._id,
      name: 'Curries',
      isActive: true,
      sortOrder: 1,
    });

    const menuItem = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Butter Chicken',
      price: 35000, // 350.00
      isAvailable: true,
      stockQuantity: 10,
      trackStock: true,
    });

    // Diner A (Debidutta) places an order
    const dinerAPhone = '9876543210';
    const dinerACustomer = await Customer.create({
      restaurantId: restaurant._id,
      name: 'Debidutta',
      phone: '+919876543210',
      totalOrdersCount: 0,
      totalSpent: 0,
    });

    const dinerAToken = tokenService.generateCustomerToken({
      id: dinerACustomer._id.toString(),
      phone: dinerACustomer.phone,
      restaurantId: restaurant._id.toString(),
      name: dinerACustomer.name,
      role: 'CUSTOMER',
    });

    const order1Res = await request(app)
      .post(`/api/v1/public/restaurants/spice-garden/tables/table_token_12/orders`)
      .set('Authorization', `Bearer ${dinerAToken}`)
      .send({
        items: [{ itemId: menuItem._id.toString(), quantity: 1 }],
        customerName: 'Debidutta',
        customerPhone: '9876543210',
      });

    expect(order1Res.status).toBe(201);
    expect(order1Res.body.success).toBe(true);

    // Diner B scans the same table (no customer token yet) and views the active table session
    const sharedSessionRes = await request(app)
      .get(`/api/v1/public/restaurants/spice-garden/tables/table_token_12/session`);

    expect(sharedSessionRes.status).toBe(200);
    expect(sharedSessionRes.body.success).toBe(true);
    expect(sharedSessionRes.body.data.orders.length).toBe(1);

    const firstOrderInSession = sharedSessionRes.body.data.orders[0];
    expect(firstOrderInSession.customerName).toBe('Debidutta');
    // Privacy check: Diner B MUST NOT see Diner A's phone number
    expect(firstOrderInSession.customerPhone).toBeUndefined();

    // But Diner A checking their own profile does see their phone
    const meRes = await request(app)
      .get('/api/v1/public/customers/me')
      .set('Authorization', `Bearer ${dinerAToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.customer.phone).toBe('+919876543210');
  });

  it('2. IDOR & CROSS-TENANT ISOLATION: cannot access another restaurant or table order', async () => {
    const restA = await Restaurant.create({ name: 'Rest A', slug: 'rest-a', code: 'RA01' });
    const restB = await Restaurant.create({ name: 'Rest B', slug: 'rest-b', code: 'RB01' });

    const tableA = await Table.create({
      restaurantId: restA._id,
      tableNumber: '1',
      displayName: 'T1',
      token: 'token_a_1',
      qrCodeUrl: '/qr/1',
      isActive: true,
    });

    const tableB = await Table.create({
      restaurantId: restB._id,
      tableNumber: '1',
      displayName: 'T1',
      token: 'token_b_1',
      qrCodeUrl: '/qr/1',
      isActive: true,
    });

    const categoryA = await Category.create({ restaurantId: restA._id, name: 'Food', isActive: true, sortOrder: 1 });
    const itemA = await MenuItem.create({
      restaurantId: restA._id,
      categoryId: categoryA._id,
      name: 'Biryani',
      price: 20000,
      isAvailable: true,
    });

    // Place order in Rest A
    const orderRes = await request(app)
      .post(`/api/v1/public/restaurants/rest-a/tables/token_a_1/orders`)
      .send({
        items: [{ itemId: itemA._id.toString(), quantity: 1 }],
        customerName: 'Sam',
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data.id;

    // Cross-Tenant IDOR: Rest B caller tries to read Rest A's order
    const idorRes = await request(app)
      .get(`/api/v1/public/restaurants/rest-b/tables/token_b_1/orders/${orderId}`);
    expect(idorRes.status).toBe(404);

    // Cross-Table IDOR: A caller at Table 2 in Rest A tries to read Table 1's order directly
    const tableA2 = await Table.create({
      restaurantId: restA._id,
      tableNumber: '2',
      displayName: 'T2',
      token: 'token_a_2',
      qrCodeUrl: '/qr/2',
      isActive: true,
    });

    const crossTableRes = await request(app)
      .get(`/api/v1/public/restaurants/rest-a/tables/token_a_2/orders/${orderId}`);
    expect(crossTableRes.status).toBe(404);
  });

  it('3. CROSS-TENANT CUSTOMER JWT: Customer token from Restaurant A is rejected by Restaurant B', async () => {
    const restA = await Restaurant.create({ name: 'Rest A', slug: 'rest-a', code: 'RA01' });
    const restB = await Restaurant.create({ name: 'Rest B', slug: 'rest-b', code: 'RB01' });

    const custA = await Customer.create({
      restaurantId: restA._id,
      name: 'Alice',
      phone: '+919999999999',
      totalOrdersCount: 0,
      totalSpent: 0,
    });

    const tokenForA = tokenService.generateCustomerToken({
      id: custA._id.toString(),
      phone: custA.phone,
      restaurantId: restA._id.toString(),
      name: custA.name,
      role: 'CUSTOMER',
    });

    // Profile check with wrong restaurant in param/header
    const res = await request(app)
      .get(`/api/v1/public/customers/me`)
      .set('Authorization', `Bearer ${tokenForA}`)
      .set('Host', 'rest-b.thescanmenu.com');

    // When tenant is rest-b, token from rest-a must be rejected with 403
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('4. OTP SECURITY: enforces 6-digit code, 60s cooldown, max 5 attempts, single-use, and no user enumeration', async () => {
    const restaurant = await Restaurant.create({ name: 'Chai Bar', slug: 'chai-bar', code: 'CB01' });

    // Step A: Send OTP (Phone normalization test: '91 98765 43210' -> '+919876543210')
    const sendRes1 = await request(app)
      .post('/api/v1/public/customers/send-otp')
      .send({ phone: '91 98765 43210', restaurantSlug: 'chai-bar' });

    expect(sendRes1.status).toBe(200);
    expect(sendRes1.body.data.phone).toBe('+919876543210');
    // Rule: isExistingUser MUST NOT be exposed
    expect(sendRes1.body.data.isExistingUser).toBeUndefined();
    expect(sendRes1.body.data.demoOtp).toBeDefined();
    expect(sendRes1.body.data.demoOtp.length).toBe(6); // 6 digits

    const validOtp = sendRes1.body.data.demoOtp;

    // Step B: Resend cooldown test (requesting immediately again triggers 429)
    const sendRes2 = await request(app)
      .post('/api/v1/public/customers/send-otp')
      .send({ phone: '+919876543210', restaurantSlug: 'chai-bar' });

    expect(sendRes2.status).toBe(429);
    expect(sendRes2.body.error.code).toBe('OTP_COOLDOWN');

    // Step C: Wrong OTP attempts
    for (let i = 1; i <= 4; i++) {
      const wrongRes = await request(app)
        .post('/api/v1/public/customers/verify-otp')
        .send({ phone: '+919876543210', otp: '000000', restaurantSlug: 'chai-bar' });
      expect(wrongRes.status).toBe(400);
      expect(wrongRes.body.error.code).toBe('INVALID_OTP');
    }

    // 5th wrong attempt exhausts max attempts
    const fifthWrongRes = await request(app)
      .post('/api/v1/public/customers/verify-otp')
      .send({ phone: '+919876543210', otp: '000000', restaurantSlug: 'chai-bar' });
    expect(fifthWrongRes.status).toBe(400);
    expect(fifthWrongRes.body.error.code).toBe('OTP_MAX_ATTEMPTS_EXCEEDED');

    // Now even sending correct OTP is rejected because attempts were exhausted
    const lateValidRes = await request(app)
      .post('/api/v1/public/customers/verify-otp')
      .send({ phone: '+919876543210', otp: validOtp, restaurantSlug: 'chai-bar' });
    expect(lateValidRes.status).toBe(400);

    // Step D: Successful verification on a fresh OTP
    // Manually advance session or create new after cooldown
    await OtpSession.deleteMany({});

    const freshSend = await request(app)
      .post('/api/v1/public/customers/send-otp')
      .send({ phone: '9876543210', restaurantSlug: 'chai-bar' });
    const freshOtp = freshSend.body.data.demoOtp;

    // Customer account does NOT exist yet
    const preCheckCust = await Customer.findOne({ phone: '+919876543210', restaurantId: restaurant._id });
    expect(preCheckCust).toBeNull();

    const verifySuccess = await request(app)
      .post('/api/v1/public/customers/verify-otp')
      .send({
        phone: '9876543210',
        otp: freshOtp,
        name: 'Rahul V.',
        restaurantSlug: 'chai-bar',
      });

    expect(verifySuccess.status).toBe(200);
    expect(verifySuccess.body.data.customer.name).toBe('Rahul V.');
    expect(verifySuccess.body.data.customer.phone).toBe('+919876543210');

    // Customer account IS created after verification
    const postCheckCust = await Customer.findOne({ phone: '+919876543210', restaurantId: restaurant._id });
    expect(postCheckCust).not.toBeNull();

    // Step E: Single-use check (reusing the same OTP fails)
    const reuseRes = await request(app)
      .post('/api/v1/public/customers/verify-otp')
      .send({
        phone: '9876543210',
        otp: freshOtp,
        restaurantSlug: 'chai-bar',
      });
    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('INVALID_OR_EXPIRED_OTP');
  });

  it('5. POSTPAID IDEMPOTENCY: prevents duplicate orders, double stock decrement, and extra session rounds on retries', async () => {
    const restaurant = await Restaurant.create({ name: 'Dosa Plaza', slug: 'dosa-plaza', code: 'DP01' });

    const table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: '3',
      displayName: 'Table 3',
      token: 'token_dosa_3',
      qrCodeUrl: '/qr/3',
      isActive: true,
    });

    const category = await Category.create({ restaurantId: restaurant._id, name: 'Tiffin', isActive: true, sortOrder: 1 });
    const item = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Masala Dosa',
      price: 12000, // 120.00
      isAvailable: true,
      stockQuantity: 5,
      trackStock: true,
    });

    const idempotencyKey = 'idemp_test_dosa_order_12345';

    const orderPayload = {
      items: [{ itemId: item._id.toString(), quantity: 2 }],
      customerName: 'Vikram',
      customerPhone: '9876543210',
    };

    // First placement
    const firstReq = await request(app)
      .post(`/api/v1/public/restaurants/dosa-plaza/tables/token_dosa_3/orders`)
      .set('Idempotency-Key', idempotencyKey)
      .send(orderPayload);

    expect(firstReq.status).toBe(201);
    expect(firstReq.body.success).toBe(true);
    const createdOrderId = firstReq.body.data.id;

    // Retry / duplicate click with SAME Idempotency-Key
    const secondReq = await request(app)
      .post(`/api/v1/public/restaurants/dosa-plaza/tables/token_dosa_3/orders`)
      .set('Idempotency-Key', idempotencyKey)
      .send(orderPayload);

    expect(secondReq.status).toBe(200);
    expect(secondReq.body.success).toBe(true);
    expect(secondReq.body.data.id).toBe(createdOrderId);

    // Verify DB records: Exactly 1 order in DB
    const orderCount = await Order.countDocuments({ restaurantId: restaurant._id });
    expect(orderCount).toBe(1);

    // Verify stock decremented only ONCE (5 - 2 = 3, NOT 5 - 4 = 1)
    const freshItem = await MenuItem.findById(item._id);
    expect(freshItem?.stockQuantity).toBe(3);

    // Verify DiningSession roundCount is 1 (NOT 2)
    const session = await DiningSession.findOne({ restaurantId: restaurant._id, tableId: table._id });
    expect(session?.roundCount).toBe(1);
    expect(session?.total).toBe(24000);

    // Payload Mismatch Test: Reusing same key with different payload
    const mismatchReq = await request(app)
      .post(`/api/v1/public/restaurants/dosa-plaza/tables/token_dosa_3/orders`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        items: [{ itemId: item._id.toString(), quantity: 1 }],
        customerName: 'Different Name',
      });

    expect(mismatchReq.status).toBe(409);
    expect(mismatchReq.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('6. SESSION DESTRUCTION PROTECTION: public clear-session endpoint is forbidden', async () => {
    const restaurant = await Restaurant.create({ name: 'Safe Cafe', slug: 'safe-cafe', code: 'SC01' });
    const table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: '1',
      displayName: 'T1',
      token: 'safe_table_token',
      qrCodeUrl: '/qr/1',
      isActive: true,
    });

    const session = await DiningSession.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      sessionCode: 'S-1234',
      joinPin: '1234',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
      roundCount: 1,
      guestCount: 2,
      subtotal: 1000,
      tax: 50,
      total: 1050,
      balanceDue: 1050,
      openedAt: new Date(),
      lastActivityAt: new Date(),
    });

    // Public attempt to clear table session
    const res = await request(app)
      .post(`/api/v1/public/restaurants/safe-cafe/tables/safe_table_token/clear-session`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    // Confirm session is still ACTIVE
    const freshSession = await DiningSession.findById(session._id);
    expect(freshSession?.status).toBe('ACTIVE');
  });
});
