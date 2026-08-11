import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from '../../src/index';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { User } from '../../src/models/User';
import { Transaction } from '../../src/models/Transaction';
import { FeatureFlag } from '../../src/models/FeatureFlag';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { tokenService } from '../../src/services/token.service';
import { CashAdapter } from '../../src/integrations/payments/adapters/CashAdapter';
import { PaymentProviderFactory } from '../../src/integrations/payments/PaymentProviderFactory';

let mongoServer: MongoMemoryServer;
let adminAccessToken: string;
let staffAccessToken: string;
let restaurantId: mongoose.Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Setup Restaurant & Auth
  const restaurant = await Restaurant.create({
    code: 'TEST-PAY',
    name: 'Payment Cafe',
    slug: 'payment-cafe',
    status: 'ACTIVE',
  });
  restaurantId = restaurant._id as mongoose.Types.ObjectId;

  await RestaurantSettings.create({
    restaurantId,
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    paymentConfig: { activeProvider: 'CASH', activeMode: 'POSTPAID', taxRatePercent: 5 },
  });

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@pay.com',
    passwordHash: 'hashed',
    role: 'MANAGER',
    restaurants: [restaurantId],
  });

  const staff = await User.create({
    name: 'Staff User',
    email: 'staff@pay.com',
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

  adminAccessToken = tokenService.generateAccessToken({
    id: (admin._id as any).toString(),
    email: admin.email,
    role: admin.role,
  });
  staffAccessToken = tokenService.generateAccessToken({
    id: (staff._id as any).toString(),
    email: staff.email,
    role: staff.role,
  });

  // Enable payment feature flag
  await FeatureFlag.create({
    restaurantId,
    key: 'payments',
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
  await Transaction.deleteMany({});
});

describe('Payment Framework Unit Tests', () => {
  it('PaymentProviderFactory resolves CashAdapter by default', () => {
    const adapter = PaymentProviderFactory.getAdapter('CASH');
    expect(adapter).toBeInstanceOf(CashAdapter);

    const defaultAdapter = PaymentProviderFactory.getAdapter('');
    expect(defaultAdapter).toBeInstanceOf(CashAdapter);
  });

  it('PaymentProviderFactory throws on unsupported providers in Phase 6', () => {
    expect(() => PaymentProviderFactory.getAdapter('RAZORPAY')).toThrow('Razorpay adapter not implemented in Phase 6');
  });

  it('CashAdapter creates intent and marks as CAPTURED immediately', async () => {
    const adapter = new CashAdapter();
    const intent = await adapter.createIntent(restaurantId.toString(), 500, 'INR');

    expect(intent.status).toBe('CAPTURED');
    expect(intent.amount).toBe(500);

    const tx = await Transaction.findById(intent.transactionId);
    expect(tx).toBeDefined();
    expect(tx?.status).toBe('CAPTURED');
    expect(tx?.provider).toBe('CASH');
  });
});

describe('Payment Framework API Integration', () => {
  beforeAll(() => { process.env.TESTING_FEATURE_FLAGS = 'true'; });
  afterAll(() => { delete process.env.TESTING_FEATURE_FLAGS; });
  it('should create a payment intent via API', async () => {
    const res = await request(app)
      .post(`/api/v1/restaurants/${restaurantId}/payments/intent`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ amount: 1000, currency: 'INR' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CAPTURED');

    const tx = await Transaction.findOne({ restaurantId });
    expect(tx).toBeDefined();
    expect(tx?.amount).toBe(1000);
  });

  it('should list transactions (Staff allowed)', async () => {
    // Create dummy transactions
    await Transaction.create([
      { restaurantId, provider: 'CASH', mode: 'POSTPAID', amount: 200, status: 'CAPTURED', currency: 'INR' },
      { restaurantId, provider: 'CASH', mode: 'PREPAID', amount: 300, status: 'PENDING', currency: 'INR' },
    ]);

    const res = await request(app)
      .get(`/api/v1/restaurants/${restaurantId}/payments/transactions`)
      .set('Authorization', `Bearer ${staffAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions.length).toBe(2);
    expect(res.body.data.total).toBe(2);
  });

  it('should filter transactions by status', async () => {
    await Transaction.create([
      { restaurantId, provider: 'CASH', mode: 'POSTPAID', amount: 200, status: 'CAPTURED', currency: 'INR' },
      { restaurantId, provider: 'CASH', mode: 'PREPAID', amount: 300, status: 'PENDING', currency: 'INR' },
    ]);

    const res = await request(app)
      .get(`/api/v1/restaurants/${restaurantId}/payments/transactions?status=PENDING`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.transactions.length).toBe(1);
    expect(res.body.data.transactions[0].status).toBe('PENDING');
  });

  it('should allow manager to update config', async () => {
    const res = await request(app)
      .patch(`/api/v1/restaurants/${restaurantId}/payments/config`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ activeProvider: 'CASH', activeMode: 'PREPAID' });

    expect(res.status).toBe(200);
    expect(res.body.data.activeMode).toBe('PREPAID');

    const settings = await RestaurantSettings.findOne({ restaurantId });
    expect(settings?.paymentConfig.activeMode).toBe('PREPAID');
  });

  it('should forbid staff from updating config', async () => {
    const res = await request(app)
      .patch(`/api/v1/restaurants/${restaurantId}/payments/config`)
      .set('Authorization', `Bearer ${staffAccessToken}`)
      .send({ activeProvider: 'CASH', activeMode: 'PREPAID' });

    expect(res.status).toBe(403);
  });

  it('should return Upgrade Required error if payments flag is disabled', async () => {
    await FeatureFlag.updateOne({ restaurantId, key: 'payments' }, { enabled: false });

    const res = await request(app)
      .get(`/api/v1/restaurants/${restaurantId}/payments/transactions`)
      .set('Authorization', `Bearer ${adminAccessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('is disabled');
  });
});
