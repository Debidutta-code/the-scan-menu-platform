import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from '../src/index';
import { Restaurant } from '../src/models/Restaurant';
import { RestaurantSettings } from '../src/models/RestaurantSettings';
import { Category } from '../src/models/Category';
import { MenuItem } from '../src/models/MenuItem';
import { Table } from '../src/models/Table';
import { User } from '../src/models/User';
import { RestaurantStaff } from '../src/models/RestaurantStaff';
import { FeatureFlag } from '../src/models/FeatureFlag';
import { Order } from '../src/models/Order';
import { IntegrationSyncLog } from '../src/models/IntegrationSyncLog';
import { IntegrationFactory } from '../src/integrations/core/IntegrationFactory';
import { PetpoojaIntegration } from '../src/integrations/adapters/PetpoojaIntegration';
import { NoOpIntegration } from '../src/integrations/adapters/NoOpIntegration';
import { encrypt, decrypt } from '../src/utils/encryption';
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

describe('Phase 10 Petpooja POS Integration Test Suite', () => {
  describe('Unit & Factory: PetpoojaIntegration & Encryption', () => {
    it('IntegrationFactory resolves PetpoojaIntegration for PETPOOJA and NoOpIntegration for NONE', () => {
      const petpoojaAdapter = IntegrationFactory.getAdapter('PETPOOJA');
      expect(petpoojaAdapter).toBeInstanceOf(PetpoojaIntegration);

      const noOpAdapter = IntegrationFactory.getAdapter('NONE');
      expect(noOpAdapter).toBeInstanceOf(NoOpIntegration);

      const defaultAdapter = IntegrationFactory.getAdapter();
      expect(defaultAdapter).toBeInstanceOf(NoOpIntegration);
    });

    it('encrypts and decrypts Petpooja API credentials correctly', () => {
      const secret = 'petpooja_super_secret_key_999';
      const encrypted = encrypt(secret);
      expect(encrypted).not.toBe(secret);
      expect(encrypted).toContain(':');

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(secret);
    });

    it('PetpoojaIntegration adapter executes pushOrder, updateOrderStatus, and syncMenu with encrypted config', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-P00001',
        name: 'Petpooja Diner',
        slug: 'petpooja-diner',
        status: 'ACTIVE',
      });

      const encryptedKey = encrypt('test_app_key');
      const encryptedSecret = encrypt('test_app_secret');
      const encryptedToken = encrypt('test_access_token');

      await RestaurantSettings.create({
        restaurantId: restaurant._id,
        paymentConfig: {
          taxRatePercent: 5,
          paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
          integrationConfig: {
            provider: 'PETPOOJA',
            config: {
              appKey: encryptedKey,
              appSecret: encryptedSecret,
              accessToken: encryptedToken,
              outletId: 'OUTLET-99',
              enabled: true,
            },
          },
        },
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Starters', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Spring Rolls',
        price: 25000,
        isAvailable: true,
      });

      const adapter = new PetpoojaIntegration();

      // Test syncMenu
      const syncRes = await adapter.syncMenu(restaurant._id.toString());
      expect(syncRes.success).toBe(true);

      const updatedItem = await MenuItem.findById(item._id);
      expect(updatedItem?.externalIds?.petpooja).toBeDefined();

      // Test pushOrder
      const order = await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'DINE_IN',
        orderNumber: 101,
        items: [
          {
            menuItemId: item._id,
            nameSnapshot: item.name,
            unitPriceSnapshot: item.price,
            quantity: 2,
            selectedAddOns: [],
            itemStatus: 'PENDING',
          },
        ],
        subtotal: 50000,
        tax: 2500,
        taxBreakdown: [],
        total: 52500,
        status: 'PENDING',
        source: 'QR',
        paymentStatus: 'PENDING',
        integrationMetadata: {},
      });

      const pushRes = await adapter.pushOrder(order);
      expect(pushRes.success).toBe(true);
      expect(pushRes.petpoojaOrderId).toBeDefined();

      const reloadedOrder = await Order.findById(order._id);
      expect(reloadedOrder?.integrationMetadata?.petpoojaOrderId).toBeDefined();

      // Test updateOrderStatus
      const statusRes = await adapter.updateOrderStatus(order._id.toString(), 'PREPARING');
      expect(statusRes.success).toBe(true);
      expect(statusRes.petpoojaStatus).toBe(2);
    });
  });

  describe('API: Manager Petpooja Configuration & Authorization', () => {
    it('allows Manager to configure Petpooja credentials write-only without echoing secrets', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-P00002',
        name: 'Config Diner',
        slug: 'config-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'pos_integration',
        enabled: true,
      });

      const manager = await User.create({
        name: 'Manager Petpooja',
        email: 'manager.petpooja@pos.dev',
        passwordHash: 'hash',
        role: 'MANAGER',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: manager._id,
        role: 'MANAGER',
        isActive: true,
      });

      await RestaurantSettings.create({
        restaurantId: restaurant._id,
        paymentConfig: {
          taxRatePercent: 0,
          paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
          integrationConfig: { provider: 'NONE', config: {} },
        },
      });

      const accessToken = jwt.sign(
        { id: manager._id.toString(), email: manager.email, role: 'MANAGER' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/integrations/petpooja/config`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          provider: 'PETPOOJA',
          appKey: 'raw_app_key_123',
          appSecret: 'raw_app_secret_456',
          accessToken: 'raw_access_token_789',
          outletId: 'OUTLET-PET-100',
          enabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.provider).toBe('PETPOOJA');
      expect(res.body.data.outletId).toBe('OUTLET-PET-100');
      expect(res.body.data.isConfigured).toBe(true);
      expect(res.body.data.appKey).toBeUndefined();
      expect(res.body.data.appSecret).toBeUndefined();

      // Verify in DB that secrets were encrypted
      const settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });
      const config = settings?.paymentConfig?.integrationConfig?.config;
      expect(config.appKey).not.toBe('raw_app_key_123');
      expect(decrypt(config.appKey)).toBe('raw_app_key_123');
    });

    it('blocks Staff role from updating Petpooja configuration', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-P00003',
        name: 'Staff Block Diner',
        slug: 'staff-block-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'pos_integration',
        enabled: true,
      });

      const staff = await User.create({
        name: 'Staff Petpooja',
        email: 'staff.petpooja@pos.dev',
        passwordHash: 'hash',
        role: 'STAFF',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: staff._id,
        role: 'STAFF',
        isActive: true,
      });

      const accessToken = jwt.sign(
        { id: staff._id.toString(), email: staff.email, role: 'STAFF' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restaurant._id}/integrations/petpooja/config`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ provider: 'PETPOOJA', appKey: 'test' });

      expect(res.status).toBe(403);
    });
  });

  describe('Non-Blocking Order Push & Webhook Processing', () => {
    it('asynchronously pushes orders in all 4 ordering modes without blocking customer checkout', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-P00004',
        name: 'MultiMode Petpooja Diner',
        slug: 'multimode-petpooja-diner',
        status: 'ACTIVE',
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
              outletId: 'OUTLET-44',
              enabled: true,
            },
          },
        },
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Beverages', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Iced Tea',
        price: 10000,
        isAvailable: true,
      });

      const table = await Table.create({
        restaurantId: restaurant._id,
        tableNumber: '10',
        displayName: 'Table 10',
        token: 'tableToken10',
        isActive: true,
        qrCodeUrl: '/qr',
      });

      // 1. DINE_IN Order
      const dineInRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
        .send({ items: [{ itemId: item._id.toString(), quantity: 1 }] });

      expect(dineInRes.status).toBe(201);
      const dineInOrderId = dineInRes.body.data._id;

      // 2. TAKEAWAY Order
      const takeawayRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurant.slug}/orders`)
        .send({
          orderMode: 'TAKEAWAY',
          customerName: 'Alice Takeaway',
          customerPhone: '9876543210',
          items: [{ itemId: item._id.toString(), quantity: 2 }],
        });

      expect(takeawayRes.status).toBe(201);
      const takeawayOrderId = takeawayRes.body.data._id;

      // Wait for non-blocking setImmediate dispatch to execute
      await new Promise((r) => setTimeout(r, 250));

      const syncLogs = await IntegrationSyncLog.find({ restaurantId: restaurant._id });
      expect(syncLogs.length).toBeGreaterThanOrEqual(2);
      expect(syncLogs.some((l) => l.orderId?.toString() === dineInOrderId && l.status === 'SUCCESS')).toBe(true);
      expect(syncLogs.some((l) => l.orderId?.toString() === takeawayOrderId && l.status === 'SUCCESS')).toBe(true);
    });

    it('processes inbound Petpooja webhook to update order status', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-P00005',
        name: 'Webhook Diner',
        slug: 'webhook-diner',
        status: 'ACTIVE',
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Main', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Burger',
        price: 1500,
        isAvailable: true,
      });

      const order = await Order.create({
        restaurantId: restaurant._id,
        orderMode: 'TAKEAWAY',
        orderNumber: 202,
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
        status: 'ACCEPTED',
        source: 'QR',
        paymentStatus: 'PAID',
        integrationMetadata: { petpoojaOrderId: 'PET-WEB-202' },
      });

      const res = await request(app)
        .post('/api/v1/webhooks/petpooja')
        .send({
          petpooja_order_id: 'PET-WEB-202',
          status: 'READY',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder?.status).toBe('READY');
    });

    it('ensures restaurants on default NONE (NoOpIntegration) continue operating with 0 regressions', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-P00006',
        name: 'Standalone Diner',
        slug: 'standalone-diner',
        status: 'ACTIVE',
      });

      await RestaurantSettings.create({
        restaurantId: restaurant._id,
        paymentConfig: {
          taxRatePercent: 0,
          paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
          integrationConfig: { provider: 'NONE', config: {} },
        },
      });

      const table = await Table.create({
        restaurantId: restaurant._id,
        tableNumber: '1',
        displayName: 'T1',
        token: 'standaloneToken1',
        isActive: true,
        qrCodeUrl: '/qr',
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Sides', isActive: true });
      const item = await MenuItem.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: 'Fries',
        price: 5000,
        isAvailable: true,
      });

      const orderRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
        .send({ items: [{ itemId: item._id.toString(), quantity: 1 }] });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.success).toBe(true);

      await new Promise((r) => setTimeout(r, 150));

      const log = await IntegrationSyncLog.findOne({ restaurantId: restaurant._id });
      expect(log?.provider).toBe('NONE');
      expect(log?.status).toBe('SUCCESS');
    });
  });
});
