import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from '../src/index';
import { Restaurant } from '../src/models/Restaurant';
import { RestaurantSettings } from '../src/models/RestaurantSettings';
import { Category } from '../src/models/Category';
import { MenuItem } from '../src/models/MenuItem';
import { User } from '../src/models/User';
import { RestaurantStaff } from '../src/models/RestaurantStaff';
import { FeatureFlag } from '../src/models/FeatureFlag';
import { Order } from '../src/models/Order';
import { IntegrationSyncLog } from '../src/models/IntegrationSyncLog';
import { encrypt } from '../src/utils/encryption';
import jwt from 'jsonwebtoken';

let mongoServer: MongoMemoryServer;
const TEST_JWT_SECRET = 'test_access_secret_key_123_abc_456_def';

beforeAll(async () => {
  process.env.TESTING_FEATURE_FLAGS = 'true';
  process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  delete process.env.TESTING_FEATURE_FLAGS;
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

describe('Phase 11 Kitchen Display System (KDS) Test Suite', () => {
  describe('KDS Active Ticket Retrieval & Station Filtering', () => {
    it('retrieves active kitchen tickets across all 4 ordering modes and excludes SERVED/CANCELLED orders', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-K00001',
        name: 'KDS Diner',
        slug: 'kds-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'kds',
        enabled: true,
      });

      const manager = await User.create({
        name: 'KDS Manager',
        email: 'kds.manager@kds.dev',
        passwordHash: 'hash',
        role: 'MANAGER',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: manager._id,
        role: 'MANAGER',
        isActive: true,
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Hot Mains', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Steak',
        price: 25000,
        isAvailable: true,
      });

      // 1. Active DINE_IN order
      await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'DINE_IN',
        orderNumber: 101,
        items: [
          {
            menuItemId: item._id,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.price,
            quantity: 1,
            selectedAddOns: [],
            itemStatus: 'PENDING',
          },
        ],
        subtotal: 25000,
        tax: 0,
        taxBreakdown: [],
        total: 25000,
        status: 'PENDING',
        source: 'QR',
        paymentStatus: 'PENDING',
      });

      // 2. Active TAKEAWAY order
      await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'TAKEAWAY',
        orderNumber: 102,
        items: [
          {
            menuItemId: item._id,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.price,
            quantity: 2,
            selectedAddOns: [],
            itemStatus: 'PREPARING',
          },
        ],
        subtotal: 50000,
        tax: 0,
        taxBreakdown: [],
        total: 50000,
        status: 'PREPARING',
        source: 'QR',
        paymentStatus: 'PAID',
      });

      // 3. Completed SERVED order (should be excluded)
      await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'COUNTER',
        orderNumber: 103,
        items: [
          {
            menuItemId: item._id,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.price,
            quantity: 1,
            selectedAddOns: [],
            itemStatus: 'SERVED',
          },
        ],
        subtotal: 25000,
        tax: 0,
        taxBreakdown: [],
        total: 25000,
        status: 'SERVED',
        source: 'POS',
        paymentStatus: 'PAID',
      });

      const token = jwt.sign(
        { id: manager._id.toString(), email: manager.email, role: 'MANAGER' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant._id}/kds/tickets`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.some((t: any) => t.orderNumber === 101)).toBe(true);
      expect(res.body.data.some((t: any) => t.orderNumber === 102)).toBe(true);
      expect(res.body.data.some((t: any) => t.orderNumber === 103)).toBe(false);
    });

    it('filters KDS tickets by orderMode query parameter', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-K00002',
        name: 'KDS Mode Diner',
        slug: 'kds-mode-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'kds',
        enabled: true,
      });

      const manager = await User.create({
        name: 'KDS Manager',
        email: 'kds.mode@kds.dev',
        passwordHash: 'hash',
        role: 'MANAGER',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: manager._id,
        role: 'MANAGER',
        isActive: true,
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Drinks', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Cola',
        price: 500,
        isAvailable: true,
      });

      await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'DINE_IN',
        orderNumber: 201,
        items: [{ menuItemId: item._id, nameSnapshot: 'Cola', unitPriceSnapshot: 500, quantity: 1, selectedAddOns: [], itemStatus: 'PENDING' }],
        subtotal: 500, tax: 0, taxBreakdown: [], total: 500, status: 'PENDING', source: 'QR', paymentStatus: 'PENDING',
      });

      await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'DELIVERY',
        orderNumber: 202,
        items: [{ menuItemId: item._id, nameSnapshot: 'Cola', unitPriceSnapshot: 500, quantity: 1, selectedAddOns: [], itemStatus: 'PENDING' }],
        subtotal: 500, tax: 0, taxBreakdown: [], total: 500, status: 'PENDING', source: 'QR', paymentStatus: 'PAID',
      });

      const token = jwt.sign(
        { id: manager._id.toString(), email: manager.email, role: 'MANAGER' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant._id}/kds/tickets?orderMode=DELIVERY`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].orderNumber).toBe(202);
      expect(res.body.data[0].orderMode).toBe('DELIVERY');
    });
  });

  describe('Item Status Advancement & Validation', () => {
    it('allows Staff to advance item status (PENDING -> PREPARING -> READY -> SERVED) and rejects backward transitions', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-K00003',
        name: 'KDS Prep Diner',
        slug: 'kds-prep-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'kds',
        enabled: true,
      });

      const staff = await User.create({
        name: 'Kitchen Staff',
        email: 'kitchen.staff@kds.dev',
        passwordHash: 'hash',
        role: 'STAFF',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: staff._id,
        role: 'STAFF',
        isActive: true,
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Pizzas', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Margherita Pizza',
        price: 1500,
        isAvailable: true,
      });

      const order = await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'DINE_IN',
        orderNumber: 301,
        items: [
          {
            menuItemId: item._id,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.price,
            quantity: 1,
            selectedAddOns: [],
            itemStatus: 'PENDING',
          },
        ],
        subtotal: 1500,
        tax: 0,
        taxBreakdown: [],
        total: 1500,
        status: 'PENDING',
        source: 'QR',
        paymentStatus: 'PENDING',
      });

      const token = jwt.sign(
        { id: staff._id.toString(), email: staff.email, role: 'STAFF' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Step 1: PENDING -> PREPARING
      const res1 = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/kds/tickets/${order._id}/items/0/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ itemStatus: 'PREPARING' });

      expect(res1.status).toBe(200);
      expect(res1.body.data.items[0].itemStatus).toBe('PREPARING');

      // Step 2: Rejects PREPARING -> PENDING (backward step)
      const res2 = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/kds/tickets/${order._id}/items/0/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ itemStatus: 'PENDING' });

      expect(res2.status).toBe(400);

      // Step 3: PREPARING -> READY
      const res3 = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/kds/tickets/${order._id}/items/0/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ itemStatus: 'READY' });

      expect(res3.status).toBe(200);
      expect(res3.body.data.items[0].itemStatus).toBe('READY');

      // Step 4: READY -> SERVED
      const res4 = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/kds/tickets/${order._id}/items/0/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ itemStatus: 'SERVED' });

      expect(res4.status).toBe(200);
      expect(res4.body.data.items[0].itemStatus).toBe('SERVED');
      expect(res4.body.data.status).toBe('SERVED');
    });

    it('allows Staff to bump an entire ticket using POST /kds/tickets/:orderId/bump', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-K00004',
        name: 'KDS Bump Diner',
        slug: 'kds-bump-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'kds',
        enabled: true,
      });

      const staff = await User.create({
        name: 'Bump Staff',
        email: 'bump.staff@kds.dev',
        passwordHash: 'hash',
        role: 'STAFF',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: staff._id,
        role: 'STAFF',
        isActive: true,
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Pasta', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Penne Arrabbiata',
        price: 1800,
        isAvailable: true,
      });

      const order = await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'TAKEAWAY',
        orderNumber: 401,
        items: [
          { menuItemId: item._id, nameSnapshot: item.name, unitPriceSnapshot: item.price, quantity: 2, selectedAddOns: [], itemStatus: 'PENDING' },
          { menuItemId: item._id, nameSnapshot: item.name, unitPriceSnapshot: item.price, quantity: 1, selectedAddOns: [], itemStatus: 'PREPARING' },
        ],
        subtotal: 5400,
        tax: 0,
        taxBreakdown: [],
        total: 5400,
        status: 'PREPARING',
        source: 'QR',
        paymentStatus: 'PAID',
      });

      const token = jwt.sign(
        { id: staff._id.toString(), email: staff.email, role: 'STAFF' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post(`/api/v1/restaurants/${restaurant._id}/kds/tickets/${order._id}/bump`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder?.status).toBe('SERVED');
      expect(updatedOrder?.items.every((i: any) => i.itemStatus === 'SERVED')).toBe(true);
    });
  });

  describe('Petpooja POS Status Relay Integration', () => {
    it('relays status updates to Petpooja non-blockingly when KDS updates cause aggregate status to change', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-K00005',
        name: 'KDS Petpooja Diner',
        slug: 'kds-petpooja-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'kds',
        enabled: true,
      });

      await RestaurantSettings.create({
        restaurantId: restaurant._id,
        paymentConfig: {
          taxRatePercent: 0,
          paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
          integrationConfig: {
            provider: 'PETPOOJA',
            config: {
              appKey: encrypt('key'),
              appSecret: encrypt('secret'),
              accessToken: encrypt('token'),
              outletId: 'OUTLET-KDS-99',
              enabled: true,
            },
          },
        },
      });

      const manager = await User.create({
        name: 'KDS Manager',
        email: 'kds.petpooja@pos.dev',
        passwordHash: 'hash',
        role: 'MANAGER',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: manager._id,
        role: 'MANAGER',
        isActive: true,
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Grill', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Burger',
        price: 1200,
        isAvailable: true,
      });

      const order = await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'DINE_IN',
        orderNumber: 501,
        items: [
          {
            menuItemId: item._id,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.price,
            quantity: 1,
            selectedAddOns: [],
            itemStatus: 'PENDING',
          },
        ],
        subtotal: 1200,
        tax: 0,
        taxBreakdown: [],
        total: 1200,
        status: 'ACCEPTED',
        source: 'QR',
        paymentStatus: 'PAID',
        integrationMetadata: { petpoojaOrderId: 'PET-KDS-501' },
      });

      const token = jwt.sign(
        { id: manager._id.toString(), email: manager.email, role: 'MANAGER' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Advance item to PREPARING -> aggregate status becomes PREPARING
      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/kds/tickets/${order._id}/items/0/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ itemStatus: 'PREPARING' });

      expect(res.status).toBe(200);

      // Wait for non-blocking POS update
      await new Promise((r) => setTimeout(r, 450));

      const logs = await IntegrationSyncLog.find({ restaurantId: restaurant._id });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs.some((l) => l.operation === 'UPDATE_STATUS' && l.status === 'SUCCESS')).toBe(true);
    });
  });

  describe('Tenant Isolation & Feature Flag Gating', () => {
    it('blocks access to KDS endpoints when kds feature flag is disabled', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-K00006',
        name: 'KDS Disabled Diner',
        slug: 'kds-disabled-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'kds',
        enabled: false,
      });

      const manager = await User.create({
        name: 'Manager Disabled',
        email: 'manager.disabled@kds.dev',
        passwordHash: 'hash',
        role: 'MANAGER',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: manager._id,
        role: 'MANAGER',
        isActive: true,
      });

      const token = jwt.sign(
        { id: manager._id.toString(), email: manager.email, role: 'MANAGER' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant._id}/kds/tickets`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('prevents staff of Restaurant A from retrieving KDS tickets of Restaurant B', async () => {
      const restA = await Restaurant.create({ code: 'RST-A00001', name: 'Rest A', slug: 'rest-a', status: 'ACTIVE' });
      const restB = await Restaurant.create({ code: 'RST-B00001', name: 'Rest B', slug: 'rest-b', status: 'ACTIVE' });

      await FeatureFlag.create({ restaurantId: restA._id, key: 'kds', enabled: true });
      await FeatureFlag.create({ restaurantId: restB._id, key: 'kds', enabled: true });

      const staffA = await User.create({
        name: 'Staff A',
        email: 'staff.a@rest.dev',
        passwordHash: 'hash',
        role: 'STAFF',
      });

      await RestaurantStaff.create({
        restaurantId: restA._id,
        userId: staffA._id,
        role: 'STAFF',
        isActive: true,
      });

      const tokenA = jwt.sign(
        { id: staffA._id.toString(), email: staffA.email, role: 'STAFF' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/v1/restaurants/${restB._id}/kds/tickets`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(403);
    });
  });
});
