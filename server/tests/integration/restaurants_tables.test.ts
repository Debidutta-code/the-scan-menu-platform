import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app, httpServer } from '../../src/index';
import { User } from '../../src/models/User';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { Table } from '../../src/models/Table';
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
  // Clear collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Phase 2 Restaurants & Tables Multi-tenancy Tests', () => {
  it('should prevent cross-tenant access and return 403 Forbidden', async () => {
    // 1. Create two users (managers)
    const passwordHash = await bcrypt.hash('PixoraDemo123!', 10);

    const managerA = await User.create({
      email: 'managerA@pixora.dev',
      passwordHash,
      role: 'MANAGER',
      name: 'Manager A',
      isActive: true,
    });

    const managerB = await User.create({
      email: 'managerB@pixora.dev',
      passwordHash,
      role: 'MANAGER',
      name: 'Manager B',
      isActive: true,
    });

    // 2. Create two restaurants
    const restaurantA = await Restaurant.create({
      code: 'RST-000001',
      name: 'Restaurant A',
      slug: 'restaurant-a',
      status: 'ACTIVE',
    });

    const restaurantB = await Restaurant.create({
      code: 'RST-000002',
      name: 'Restaurant B',
      slug: 'restaurant-b',
      status: 'ACTIVE',
    });

    // 3. Associate manager A with restaurant A and manager B with restaurant B
    await RestaurantStaff.create({
      userId: managerA.id,
      restaurantId: restaurantA.id,
      role: 'MANAGER',
      isActive: true,
    });

    await RestaurantStaff.create({
      userId: managerB.id,
      restaurantId: restaurantB.id,
      role: 'MANAGER',
      isActive: true,
    });

    // 4. Log in as manager A and manager B to retrieve their access tokens
    const loginARes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'managerA@pixora.dev', password: 'PixoraDemo123!' });
    const tokenA = loginARes.body.data.accessToken;

    // 5. Manager A accesses Restaurant A tables list (should be 200 OK)
    const listTablesA = await request(app)
      .get(`/api/v1/restaurants/${restaurantA.id}/tables`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listTablesA.status).toBe(200);

    // 6. Manager A accesses Restaurant B tables list (cross-tenant, should be 403 Forbidden)
    const listTablesCross = await request(app)
      .get(`/api/v1/restaurants/${restaurantB.id}/tables`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listTablesCross.status).toBe(403);
    expect(listTablesCross.body.success).toBe(false);
    expect(listTablesCross.body.error.code).toBe('FORBIDDEN');
  });

  it('should invalidate old table token upon token/QR regeneration', async () => {
    // 1. Setup restaurant, manager and table
    const passwordHash = await bcrypt.hash('PixoraDemo123!', 10);
    const manager = await User.create({
      email: 'manager@pixora.dev',
      passwordHash,
      role: 'MANAGER',
      name: 'Manager',
      isActive: true,
    });

    const restaurant = await Restaurant.create({
      code: 'RST-000003',
      name: 'Regen Test Rest',
      slug: 'regen-test-rest',
      status: 'ACTIVE',
    });

    await RestaurantStaff.create({
      userId: manager.id,
      restaurantId: restaurant.id,
      role: 'MANAGER',
      isActive: true,
    });

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@pixora.dev', password: 'PixoraDemo123!' });
    const token = loginRes.body.data.accessToken;

    // Create table
    const tableRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant.id}/tables`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tableNumber: '1', displayName: 'Table One' });

    expect(tableRes.status).toBe(201);
    const tableId = tableRes.body.data._id;
    const oldTableToken = tableRes.body.data.token;

    // Public resolution should find it with old token
    const publicOldRes = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${oldTableToken}`);
    expect(publicOldRes.status).toBe(200);
    expect(publicOldRes.body.success).toBe(true);

    // Regenerate QR/token
    const regenRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant.id}/tables/${tableId}/regenerate-qr`)
      .set('Authorization', `Bearer ${token}`);

    expect(regenRes.status).toBe(200);
    const newTableToken = regenRes.body.data.token;
    expect(newTableToken).not.toBe(oldTableToken);

    // Old token should now return TABLE_NOT_FOUND (404)
    const publicOldResAfterRegen = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${oldTableToken}`);
    expect(publicOldResAfterRegen.status).toBe(404);
    expect(publicOldResAfterRegen.body.error.code).toBe('TABLE_NOT_FOUND');

    // New token should resolve successfully
    const publicNewRes = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${newTableToken}`);
    expect(publicNewRes.status).toBe(200);
  });

  it('should bulk create tables properly with prefixes', async () => {
    const passwordHash = await bcrypt.hash('PixoraDemo123!', 10);
    const manager = await User.create({
      email: 'manager_bulk@pixora.dev',
      passwordHash,
      role: 'MANAGER',
      name: 'Manager Bulk',
      isActive: true,
    });

    const restaurant = await Restaurant.create({
      code: 'RST-000005',
      name: 'Bulk Test Rest',
      slug: 'bulk-test-rest',
      status: 'ACTIVE',
    });

    await RestaurantStaff.create({
      userId: manager.id,
      restaurantId: restaurant.id,
      role: 'MANAGER',
      isActive: true,
    });

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager_bulk@pixora.dev', password: 'PixoraDemo123!' });
    const token = loginRes.body.data.accessToken;

    const bulkRes = await request(app)
      .post(`/api/v1/restaurants/${restaurant.id}/tables/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({ count: 5, prefix: 'T-' });

    if (bulkRes.status !== 201) {
      console.error(bulkRes.body);
    }
    expect(bulkRes.status).toBe(201);
    expect(bulkRes.body.success).toBe(true);
    expect(bulkRes.body.data.count).toBe(5);

    const listRes = await request(app)
      .get(`/api/v1/restaurants/${restaurant.id}/tables`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    const tables = listRes.body.data;
    expect(tables.length).toBe(5);

    const tableNumbers = tables.map((t: any) => t.tableNumber).sort();
    expect(tableNumbers).toEqual(['T-1', 'T-2', 'T-3', 'T-4', 'T-5']);
  });

  it('should return unavailable/TABLE_NOT_FOUND state on suspended restaurant public route', async () => {
    // 1. Create suspended restaurant and table
    const restaurant = await Restaurant.create({
      code: 'RST-000004',
      name: 'Suspended Rest',
      slug: 'suspended-rest',
      status: 'SUSPENDED',
    });

    const table = await Table.create({
      restaurantId: restaurant.id,
      tableNumber: '5',
      displayName: 'Table 5',
      token: 'secureTokenForSuspendedTableXYZ123',
      isActive: true,
      qrCodeUrl: '/dummy',
    });

    // 2. Access public route
    const publicRes = await request(app)
      .get(`/api/v1/public/restaurants/${restaurant.slug}/tables/${table.token}`);

    expect(publicRes.status).toBe(404);
    expect(publicRes.body.success).toBe(false);
    expect(publicRes.body.error.code).toBe('TABLE_NOT_FOUND');
  });
});
