import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app, httpServer } from '../../src/index';
import { User } from '../../src/models/User';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { RestaurantStats } from '../../src/models/RestaurantStats';
import { RestaurantOnboarding } from '../../src/models/RestaurantOnboarding';
import { Counter } from '../../src/models/Counter';
import { Table } from '../../src/models/Table';
import { FeatureFlag } from '../../src/models/FeatureFlag';
import { SubscriptionPlan } from '../../src/models/SubscriptionPlan';
import { counterService } from '../../src/services/counter.service';
import { restaurantProvisioningService } from '../../src/services/restaurantProvisioning.service';
import bcrypt from 'bcrypt';

let replSet: MongoMemoryReplSet;
let superAdminToken: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const mongoUri = replSet.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);

  // Seed default SubscriptionPlans required for FREE assignment
  await SubscriptionPlan.create([
    { key: 'FREE', name: 'Free', includedFeatureKeys: ['qr_menu'] },
    { key: 'STARTER', name: 'Starter', includedFeatureKeys: ['qr_menu', 'waiter_call', 'ordering'] },
    { key: 'PROFESSIONAL', name: 'Professional', includedFeatureKeys: ['qr_menu', 'waiter_call', 'ordering', 'analytics', 'payments'] },
    { key: 'ENTERPRISE', name: 'Enterprise', includedFeatureKeys: ['qr_menu', 'waiter_call', 'ordering', 'analytics', 'payments', 'kds', 'pos', 'api_access'] },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

beforeEach(async () => {
  // Clear non-plan collections
  await User.deleteMany({});
  await Restaurant.deleteMany({});
  await RestaurantSettings.deleteMany({});
  await RestaurantStats.deleteMany({});
  await RestaurantOnboarding.deleteMany({});
  await Counter.deleteMany({});
  await Table.deleteMany({});
  await FeatureFlag.deleteMany({});

  // Create Super Admin & retrieve token for Admin API tests
  const passwordHash = await bcrypt.hash('PixoraDemo123!', 10);
  await User.create({
    email: 'superadmin_prov@pixora.dev',
    passwordHash,
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'superadmin_prov@pixora.dev', password: 'PixoraDemo123!' });

  superAdminToken = loginRes.body.data.accessToken;
});

describe('Phase 4 Restaurant Provisioning & Multi-Tenant Foundation', () => {
  it('1. Counter Service generating atomic sequential codes (RST-000001, RST-000002)', async () => {
    const code1 = await counterService.getNextSequence('restaurant_code', 'RST-', 6);
    const code2 = await counterService.getNextSequence('restaurant_code', 'RST-', 6);

    expect(code1).toBe('RST-000001');
    expect(code2).toBe('RST-000002');
  });

  it('2. Full Restaurant Provisioning Service inside one transaction', async () => {
    const result = await restaurantProvisioningService.provisionRestaurant({
      restaurant: {
        name: 'The Grand Gourmet',
        slug: 'grand-gourmet',
        email: 'info@grandgourmet.com',
        phone: '+919876543210',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
      },
      manager: {
        name: 'Chef Owner',
        email: 'chef@grandgourmet.com',
        password: 'Password123!',
      },
    });

    expect(result).toBeDefined();
    expect(result.restaurant.code).toBe('RST-000001');
    expect(result.restaurant.status).toBe('TRIAL');

    // Verify Manager User
    expect(result.manager.email).toBe('chef@grandgourmet.com');

    // Verify RestaurantSettings document
    const settings = await RestaurantSettings.findOne({ restaurantId: result.restaurant._id });
    expect(settings).toBeDefined();
    expect(settings?.currency).toBe('INR');
    expect(settings?.timezone).toBe('Asia/Kolkata');

    // Verify RestaurantStats document
    const stats = await RestaurantStats.findOne({ restaurantId: result.restaurant._id });
    expect(stats).toBeDefined();
    expect(stats?.tablesCount).toBe(10);
    expect(stats?.staffCount).toBe(1);

    // Verify RestaurantOnboarding document
    const onboarding = await RestaurantOnboarding.findOne({ restaurantId: result.restaurant._id });
    expect(onboarding).toBeDefined();
    expect(onboarding?.restaurantCreated).toBe(true);
    expect(onboarding?.managerCreated).toBe(true);

    // Verify Tables T1-T10 created
    const tables = await Table.find({ restaurantId: result.restaurant._id });
    expect(tables.length).toBe(10);
    expect(tables[0].displayName).toBe('Table 1');
    expect(tables[9].displayName).toBe('Table 10');

    // Verify Subscription FREE assigned and FeatureFlags synced
    const flags = await FeatureFlag.find({ restaurantId: result.restaurant._id });
    expect(flags.length).toBeGreaterThan(0);
    const qrMenuFlag = flags.find((f) => f.key === 'qr_menu');
    expect(qrMenuFlag?.enabled).toBe(true);
  });

  it('3. Provisioning transaction rollback on mid-operation failure', async () => {
    // 1. Create an existing restaurant with a specific slug
    await Restaurant.create({
      code: 'RST-999999',
      name: 'Existing Rest',
      slug: 'existing-slug',
      status: 'ACTIVE',
    });

    // 2. Attempt provisioning with explicit conflicting slug
    let caughtError: Error | null = null;
    try {
      await restaurantProvisioningService.provisionRestaurant({
        restaurant: { name: 'Rollback Test Rest', slug: 'existing-slug' },
        manager: { name: 'Conflict Manager', email: 'conflict_manager@pixora.dev', password: 'pass' },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('SLUG_CONFLICT');

    // Verify rollback: zero restaurants should exist with name 'Rollback Test Rest'
    const restaurant = await Restaurant.findOne({ name: 'Rollback Test Rest' });
    expect(restaurant).toBeNull();
  });

  it('4. POST /api/v1/admin/restaurants/provision endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/admin/restaurants/provision')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'API Provision Cafe',
        slug: 'api-provision-cafe',
        manager: {
          name: 'API Manager',
          email: 'apimanager@cafe.dev',
          password: 'Password123!',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restaurant.code).toBeDefined();
    expect(res.body.data.tablesCount).toBe(10);
  });

  it('5. GET /api/v1/admin/restaurants/:id/onboarding endpoint', async () => {
    const provisionResult = await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Onboarding Check Rest' },
      manager: { name: 'Manager Onb', email: 'manageronb@test.dev', password: 'Password123!' },
    });

    const res = await request(app)
      .get(`/api/v1/admin/restaurants/${provisionResult.restaurant._id}/onboarding`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.restaurantCreated).toBe(true);
    expect(res.body.data.tablesCreated).toBe(true);
  });

  it('6. Duplicate slug rejects with SLUG_CONFLICT', async () => {
    await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Slug Original', slug: 'slug-unique-test' },
      manager: { name: 'Mgr Original', email: 'slug_original@test.dev', password: 'Password123!' },
    });

    let caughtError: Error | null = null;
    try {
      await restaurantProvisioningService.provisionRestaurant({
        restaurant: { name: 'Slug Duplicate', slug: 'slug-unique-test' },
        manager: { name: 'Mgr Duplicate', email: 'slug_dupe@test.dev', password: 'Password123!' },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('SLUG_CONFLICT');

    const count = await Restaurant.countDocuments({ slug: 'slug-unique-test' });
    expect(count).toBe(1);
  });

  it('7. Duplicate manager email rejects with DUPLICATE_EMAIL', async () => {
    const passwordHash = await bcrypt.hash('Existing123!', 10);
    await User.create({
      email: 'duplicate_manager@test.dev',
      passwordHash,
      name: 'Existing Manager',
      role: 'MANAGER',
      isActive: true,
    });

    let caughtError: Error | null = null;
    try {
      await restaurantProvisioningService.provisionRestaurant({
        restaurant: { name: 'Dupe Email Rest' },
        manager: { name: 'New Mgr', email: 'duplicate_manager@test.dev', password: 'Password123!' },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('DUPLICATE_EMAIL');
  });

  it('8. Restaurant code generation is sequential (RST-000001, RST-000002)', async () => {
    const r1 = await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Code Gen One' },
      manager: { name: 'M1', email: 'codegen1@test.dev', password: 'Password123!' },
    });
    const r2 = await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Code Gen Two' },
      manager: { name: 'M2', email: 'codegen2@test.dev', password: 'Password123!' },
    });

    expect(r1.restaurant.code).toBe('RST-000001');
    expect(r2.restaurant.code).toBe('RST-000002');
  });

  it('9. SUSPENDED restaurant blocks access for non-SUPER_ADMIN', async () => {
    const provision = await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Suspended Cafe' },
      manager: { name: 'Mgr Suspended', email: 'mgrsuspended@test.dev', password: 'Password123!' },
    });

    // Suspend the restaurant
    await Restaurant.findByIdAndUpdate(provision.restaurant._id, { status: 'SUSPENDED' });

    // Log in as the MANAGER (non-super-admin)
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'mgrsuspended@test.dev', password: 'Password123!' });
    const managerToken: string = loginRes.body.data.accessToken;

    const menuRes = await request(app)
      .get(`/api/v1/restaurants/${provision.restaurant._id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(menuRes.status).toBe(403);
    expect(menuRes.body.error.code).toBe('RESTAURANT_SUSPENDED');
  });

  it('10. EXPIRED restaurant blocks access for non-SUPER_ADMIN', async () => {
    const provision = await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Expired Diner' },
      manager: { name: 'Mgr Expired', email: 'mgrexpired@test.dev', password: 'Password123!' },
    });

    // Expire the restaurant
    await Restaurant.findByIdAndUpdate(provision.restaurant._id, { status: 'EXPIRED' });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'mgrexpired@test.dev', password: 'Password123!' });
    const managerToken: string = loginRes.body.data.accessToken;

    const menuRes = await request(app)
      .get(`/api/v1/restaurants/${provision.restaurant._id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(menuRes.status).toBe(403);
    expect(menuRes.body.error.code).toBe('RESTAURANT_SUSPENDED');
  });

  it('11. Provision response includes credentials and summary', async () => {
    const result = await restaurantProvisioningService.provisionRestaurant({
      restaurant: { name: 'Response Shape Test', currency: 'USD', timezone: 'America/New_York' },
      manager: { name: 'Shape Mgr', email: 'shapemgr@test.dev', password: 'Password123!' },
    });

    expect(result.credentials).toBeDefined();
    expect(result.credentials.email).toBe('shapemgr@test.dev');
    expect(result.credentials.temporaryPassword).toBe('Password123!');

    expect(result.summary).toBeDefined();
    expect(result.summary.restaurantCode).toMatch(/^RST-\d{6}$/);
    expect(result.summary.tablesProvisioned).toBe(10);
    expect(result.summary.planAssigned).toBe('FREE');
  });

  it('12. Invalid timezone rejects with VALIDATION error', async () => {
    let caughtError: Error | null = null;
    try {
      await restaurantProvisioningService.provisionRestaurant({
        restaurant: { name: 'Invalid TZ Rest', timezone: 'Mars/Olympus' },
        manager: { name: 'Mgr TZ', email: 'mgrtz@test.dev', password: 'Password123!' },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('VALIDATION');
    expect(caughtError?.message).toContain('timezone');
  });

  it('13. Invalid currency rejects with VALIDATION error', async () => {
    let caughtError: Error | null = null;
    try {
      await restaurantProvisioningService.provisionRestaurant({
        restaurant: { name: 'Invalid Currency Rest', currency: 'dollars' },
        manager: { name: 'Mgr Currency', email: 'mgrcurrency@test.dev', password: 'Password123!' },
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.message).toContain('VALIDATION');
    expect(caughtError?.message).toContain('currency');
  });
});
