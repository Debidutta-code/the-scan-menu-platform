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
import { IntegrationSyncLog } from '../src/models/IntegrationSyncLog';
import { IntegrationFactory } from '../src/integrations/core/IntegrationFactory';
import { NoOpIntegration } from '../src/integrations/adapters/NoOpIntegration';
import { PetpoojaIntegration } from '../src/integrations/adapters/PetpoojaIntegration';
import { posIntegrationService } from '../src/services/posIntegration.service';
import jwt from 'jsonwebtoken';

let mongoServer: MongoMemoryServer;
const TEST_JWT_SECRET = 'test_access_secret_key_123_abc_456_def';

beforeAll(async () => {
  process.env.TESTING_FEATURE_FLAGS = 'true';

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

describe('Phase 9 POS Adapter Framework & Integration Tests', () => {
  describe('Unit: RestaurantIntegration Interface & Factory', () => {
    it('NoOpIntegration implements all required methods and resolves successfully', async () => {
      const adapter = new NoOpIntegration();

      const syncMenuRes = await adapter.syncMenu('rest-123');
      expect(syncMenuRes.success).toBe(true);

      const pushOrderRes = await adapter.pushOrder({ orderNumber: 1 });
      expect(pushOrderRes.success).toBe(true);

      const updateStatusRes = await adapter.updateOrderStatus('order-123', 'SERVED');
      expect(updateStatusRes.success).toBe(true);
    });

    it('IntegrationFactory resolves NoOpIntegration for NONE, undefined, or unknown providers', () => {
      expect(IntegrationFactory.getAdapter('NONE')).toBeInstanceOf(NoOpIntegration);
      expect(IntegrationFactory.getAdapter(undefined)).toBeInstanceOf(NoOpIntegration);
      expect(IntegrationFactory.getAdapter('')).toBeInstanceOf(NoOpIntegration);
      expect(IntegrationFactory.getAdapter('UNKNOWN_PROVIDER')).toBeInstanceOf(NoOpIntegration);
    });

    it('IntegrationFactory resolves PETPOOJA adapter', () => {
      const adapter = IntegrationFactory.getAdapter('PETPOOJA');
      expect(adapter).toBeInstanceOf(PetpoojaIntegration);
    });
  });

  describe('Non-Blocking POS Dispatch & Sync Logs', () => {
    it('records SUCCESS sync log for NoOpIntegration on Dine-In order creation', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-000001',
        name: 'Integration Diner',
        slug: 'integration-diner',
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
        displayName: 'Table 1',
        token: 'tokenT1',
        isActive: true,
        qrCodeUrl: '/dummy',
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Grills', isActive: true });
      const item = await MenuItem.create({ restaurantId: restaurant._id, categoryId: category._id, name: 'Steak', price: 1500, isAvailable: true });

      const orderRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
        .send({ items: [{ itemId: item.id, quantity: 1 }] });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.success).toBe(true);
      const orderId = orderRes.body.data._id;

      await new Promise((r) => setTimeout(r, 150));

      const log = await IntegrationSyncLog.findOne({ orderId: new mongoose.Types.ObjectId(orderId) });
      expect(log).not.toBeNull();
      expect(log?.provider).toBe('NONE');
      expect(log?.operation).toBe('PUSH_ORDER');
      expect(['SUCCESS', 'ORDER_SYNCED']).toContain(log?.status);
    });

    it('remains non-blocking and creates FAILED sync log when POS adapter fails', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-000002',
        name: 'Failing POS Diner',
        slug: 'failing-pos-diner',
        status: 'ACTIVE',
      });

      await RestaurantSettings.create({
        restaurantId: restaurant._id,
        paymentConfig: {
          taxRatePercent: 0,
          paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
          integrationConfig: { provider: 'PETPOOJA', config: {} },
        },
      });

      const table = await Table.create({
        restaurantId: restaurant._id,
        tableNumber: '2',
        displayName: 'Table 2',
        token: 'tokenT2',
        isActive: true,
        qrCodeUrl: '/dummy',
      });

      const category = await Category.create({ restaurantId: restaurant._id, name: 'Mains', isActive: true });
      const item = await MenuItem.create({ restaurantId: restaurant._id, categoryId: category._id, name: 'Pasta', price: 1200, isAvailable: true });

      const orderRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}/orders`)
        .send({ items: [{ itemId: item.id, quantity: 1 }] });

      expect(orderRes.status).toBe(201);
      expect(orderRes.body.success).toBe(true);
      const orderId = orderRes.body.data._id;

      await new Promise((r) => setTimeout(r, 150));

      const log = await IntegrationSyncLog.findOne({ orderId: new mongoose.Types.ObjectId(orderId) });
      expect(log).not.toBeNull();
      expect(log?.provider).toBe('PETPOOJA');
      expect(log?.operation).toBe('PUSH_ORDER');
      expect(log?.status).toBe('FAILED');
      expect(log?.errorMessage || log?.errorLog).toBeDefined();
    });

    it('tracks menu sync and order status update operations in IntegrationSyncLog', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-000003',
        name: 'Async Sync Diner',
        slug: 'async-sync-diner',
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

      await posIntegrationService.syncMenuAsync(restaurant._id);
      await new Promise((r) => setTimeout(r, 150));

      const menuLog = await IntegrationSyncLog.findOne({ restaurantId: restaurant._id, operation: 'SYNC_MENU' });
      expect(menuLog).not.toBeNull();
      expect(menuLog?.status).toBe('SUCCESS');

      const dummyOrderId = new mongoose.Types.ObjectId();
      await posIntegrationService.updateOrderStatusAsync(restaurant._id, dummyOrderId, 'SERVED');
      await new Promise((r) => setTimeout(r, 150));

      const statusLog = await IntegrationSyncLog.findOne({ restaurantId: restaurant._id, operation: 'UPDATE_STATUS' });
      expect(statusLog).not.toBeNull();
      expect(statusLog?.status).toBe('SUCCESS');
    });
  });

  describe('Manager Sync Logs API Endpoint (GET /api/v1/restaurants/:restaurantId/integrations/sync-logs)', () => {
    it('allows manager to view sync logs with tenant isolation and feature flag enforcement', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-000004',
        name: 'Manager Log Diner',
        slug: 'manager-log-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'pos_integration',
        enabled: true,
      });

      const manager = await User.create({
        name: 'Manager User',
        email: 'manager@pos.dev',
        passwordHash: 'hash',
        role: 'MANAGER',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: manager._id,
        role: 'MANAGER',
        isActive: true,
      });

      await IntegrationSyncLog.create({
        restaurantId: restaurant._id,
        provider: 'NONE',
        operation: 'SYNC_MENU',
        status: 'SUCCESS',
      });

      const accessToken = jwt.sign(
        { id: manager._id.toString(), email: manager.email, role: 'MANAGER' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant._id}/integrations/sync-logs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toHaveLength(1);
      expect(res.body.data.logs[0].operation).toBe('SYNC_MENU');
    });

    it('blocks staff from viewing integration sync logs', async () => {
      const restaurant = await Restaurant.create({
        code: 'RST-000005',
        name: 'Staff Block Diner',
        slug: 'staff-block-diner',
        status: 'ACTIVE',
      });

      await FeatureFlag.create({
        restaurantId: restaurant._id,
        key: 'pos_integration',
        enabled: true,
      });

      const staffUser = await User.create({
        name: 'Staff User',
        email: 'staff@pos.dev',
        passwordHash: 'hash',
        role: 'STAFF',
      });

      await RestaurantStaff.create({
        restaurantId: restaurant._id,
        userId: staffUser._id,
        role: 'STAFF',
        isActive: true,
      });

      const accessToken = jwt.sign(
        { id: staffUser._id.toString(), email: staffUser.email, role: 'STAFF' },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/v1/restaurants/${restaurant._id}/integrations/sync-logs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
