import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/index';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Table } from '../../src/models/Table';
import { Category } from '../../src/models/Category';
import { MenuItem } from '../../src/models/MenuItem';
import { User } from '../../src/models/User';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { Order } from '../../src/models/Order';
import { DiningSession } from '../../src/models/DiningSession';
import { FeatureFlag } from '../../src/models/FeatureFlag';
import { tokenService } from '../../src/services/token.service';

let mongoServer: MongoMemoryServer;

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
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Order Status Revert & Table Session Closing Integration Tests', () => {
  let restaurant: any;
  let manager: any;
  let managerToken: string;
  let table: any;
  let item: any;

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();

    restaurant = await Restaurant.create({
      code: 'RST-REV001',
      name: 'Revert Test Cafe',
      slug: 'revert-test-cafe',
      status: 'ACTIVE',
    });

    await FeatureFlag.create({
      restaurantId: restaurant._id,
      key: 'ordering',
      enabled: true,
    });

    await RestaurantSettings.create({
      restaurantId: restaurant._id,
      workflow: {
        orderWorkflowMode: 'FIVE_STEP',
      },
    });

    manager = await User.create({
      name: 'Manager Revert',
      email: 'manager.revert@cafe.dev',
      passwordHash: 'hash',
      role: 'MANAGER',
    });

    await RestaurantStaff.create({
      restaurantId: restaurant._id,
      userId: manager._id,
      role: 'MANAGER',
      isActive: true,
    });

    managerToken = tokenService.generateAccessToken({
      id: manager._id.toString(),
      email: manager.email,
      role: 'MANAGER',
    });

    table = await Table.create({
      restaurantId: restaurant._id,
      tableNumber: 'T-10',
      displayName: 'Table 10',
      capacity: 4,
      isActive: true,
      token: 'tbl_tok_10',
      qrCodeUrl: 'https://qr.pixora.dev/10',
    });

    const category = await Category.create({
      restaurantId: restaurant._id,
      name: 'Mains',
      isActive: true,
    });

    item = await MenuItem.create({
      restaurantId: restaurant._id,
      categoryId: category._id,
      name: 'Special Pasta',
      price: 1200,
      isAvailable: true,
    });
  });

  it('allows advancing from PENDING to SERVED and reverting from SERVED back to PREPARING', async () => {
    const session = await DiningSession.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      sessionCode: 'S-9901',
      joinPin: '1234',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
    });

    const order = await Order.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      diningSessionId: session._id,
      orderNumber: 501,
      orderMode: 'DINE_IN',
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
      subtotal: 2400,
      tax: 0,
      total: 2400,
      status: 'PENDING',
      source: 'QR',
      paymentStatus: 'PENDING',
    });

    // 1. Advance to ACCEPTED
    const resAccepted = await request(app)
      .patch(`/api/v1/restaurants/${restaurant._id}/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'ACCEPTED' });
    expect(resAccepted.status).toBe(200);
    expect(resAccepted.body.data.status).toBe('ACCEPTED');

    // 2. Advance to PREPARING
    const resPrep = await request(app)
      .patch(`/api/v1/restaurants/${restaurant._id}/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'PREPARING' });
    expect(resPrep.status).toBe(200);
    expect(resPrep.body.data.status).toBe('PREPARING');

    // 3. Advance to READY
    const resReady = await request(app)
      .patch(`/api/v1/restaurants/${restaurant._id}/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'READY' });
    expect(resReady.status).toBe(200);
    expect(resReady.body.data.status).toBe('READY');

    // 4. Advance to SERVED
    const resServed = await request(app)
      .patch(`/api/v1/restaurants/${restaurant._id}/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'SERVED' });
    expect(resServed.status).toBe(200);
    expect(resServed.body.data.status).toBe('SERVED');
    expect(resServed.body.data.items[0].itemStatus).toBe('SERVED');

    // 5. Revert back from SERVED to READY
    const resRevertReady = await request(app)
      .patch(`/api/v1/restaurants/${restaurant._id}/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'READY' });
    expect(resRevertReady.status).toBe(200);
    expect(resRevertReady.body.data.status).toBe('READY');
    expect(resRevertReady.body.data.items[0].itemStatus).toBe('READY');

    // 6. Revert back from READY to PREPARING
    const resRevertPrep = await request(app)
      .patch(`/api/v1/restaurants/${restaurant._id}/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ status: 'PREPARING' });
    expect(resRevertPrep.status).toBe(200);
    expect(resRevertPrep.body.data.status).toBe('PREPARING');
    expect(resRevertPrep.body.data.items[0].itemStatus).toBe('PREPARING');

    // 7. Verify order shows in active orders list
    const resActive = await request(app)
      .get(`/api/v1/restaurants/${restaurant._id}/orders/active`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(resActive.status).toBe(200);
    expect(resActive.body.data.some((o: any) => o._id === order._id.toString())).toBe(true);
  });

  it('closes a dining session properly freeing the table and marking status as CLOSED', async () => {
    const session = await DiningSession.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      sessionCode: 'S-9902',
      joinPin: '1234',
      status: 'ACTIVE',
      paymentMode: 'POSTPAID',
    });

    const resClose = await request(app)
      .post(`/api/v1/restaurants/${restaurant._id}/table-sessions/${session._id}/close`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(resClose.status).toBe(200);
    expect(resClose.body.success).toBe(true);
    expect(resClose.body.data.status).toBe('CLOSED');
    expect(resClose.body.data.closedAt).toBeDefined();

    const dbSession = await DiningSession.findById(session._id);
    expect(dbSession?.status).toBe('CLOSED');
    expect(dbSession?.closedAt).toBeDefined();
  });
});
