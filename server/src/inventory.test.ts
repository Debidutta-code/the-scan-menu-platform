import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { app } from '../src/index';
import { MenuItem } from '../src/models/MenuItem';
import { Category } from '../src/models/Category';
import { Restaurant } from '../src/models/Restaurant';
import { User } from '../src/models/User';
import { RestaurantStaff } from '../src/models/RestaurantStaff';
import { Table } from '../src/models/Table';
import { InventoryLog } from '../src/models/InventoryLog';
import { featureFlagService } from '../src/services/featureFlag.service';

describe('Phase 12 Inventory Management Test Suite', () => {
  let restAId: string;
  let restBId: string;
  let categoryAId: string;
  let managerAToken: string;
  let staffAToken: string;
  let managerAUser: any;
  let staffAUser: any;
  let tableAToken: string;
  let restaurantASlug: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/scan_menu_test');
    }
  });

  beforeEach(async () => {
    await MenuItem.deleteMany({});
    await Category.deleteMany({});
    await Restaurant.deleteMany({});
    await User.deleteMany({});
    await RestaurantStaff.deleteMany({});
    await Table.deleteMany({});
    await InventoryLog.deleteMany({});

    // Setup Restaurant A
    const restA = await Restaurant.create({
      code: 'RST-INV01',
      name: 'Inventory Bistro',
      slug: 'inventory-bistro',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restAId = restA._id.toString();
    restaurantASlug = restA.slug;

    // Setup Restaurant B (for tenant isolation)
    const restB = await Restaurant.create({
      code: 'RST-INV02',
      name: 'Isolation Diner',
      slug: 'isolation-diner',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restBId = restB._id.toString();

    // Enable inventory & qr_menu feature flags for both
    await featureFlagService.enable(restAId, 'inventory');
    await featureFlagService.enable(restAId, 'qr_menu');
    await featureFlagService.enable(restBId, 'inventory');
    await featureFlagService.enable(restBId, 'qr_menu');
    await featureFlagService.enable(restAId, 'kds');

    // Manager User for Rest A
    const passwordHash = await bcrypt.hash('Password123!', 10);
    managerAUser = await User.create({
      email: 'manager-inv@bistro.com',
      passwordHash,
      name: 'Manager Inv',
      role: 'MANAGER',
      isActive: true,
    });
    await RestaurantStaff.create({
      userId: managerAUser._id,
      restaurantId: restA._id,
      role: 'MANAGER',
      isActive: true,
    });
    const mgrLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager-inv@bistro.com', password: 'Password123!' });
    managerAToken = mgrLoginRes.body.data.accessToken;

    // Staff User for Rest A
    staffAUser = await User.create({
      email: 'staff-inv@bistro.com',
      passwordHash,
      name: 'Staff Inv',
      role: 'STAFF',
      isActive: true,
    });
    await RestaurantStaff.create({
      userId: staffAUser._id,
      restaurantId: restA._id,
      role: 'STAFF',
      isActive: true,
    });
    const staffLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'staff-inv@bistro.com', password: 'Password123!' });
    staffAToken = staffLoginRes.body.data.accessToken;

    // Category for Rest A
    const catA = await Category.create({
      restaurantId: restA._id,
      name: 'Starters',
      sortOrder: 1,
      isActive: true,
    });
    categoryAId = catA._id.toString();

    // Table for Rest A
    const tableA = await Table.create({
      restaurantId: restA._id,
      tableNumber: 'T1',
      displayName: 'Table 1',
      token: 'tok-inv-table-1',
      qrCodeUrl: 'https://example.com/qr/tok-inv-table-1',
      isActive: true,
    });
    tableAToken = tableA.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Item Availability Toggling & Authorization', () => {
    it('allows Manager and Staff to toggle 86 status and reflects immediately', async () => {
      const item = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Spring Rolls',
        price: 25000,
        isAvailable: true,
      });

      // Staff toggles to unavailable (86ed)
      const resStaff = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/menu-items/${item._id}/availability`)
        .set('Authorization', `Bearer ${staffAToken}`)
        .send({ isAvailable: false });

      expect(resStaff.status).toBe(200);
      expect(resStaff.body.data.isAvailable).toBe(false);

      const dbItem1 = await MenuItem.findById(item._id);
      expect(dbItem1?.isAvailable).toBe(false);

      // Verify Audit Log
      const logs = await InventoryLog.find({ menuItemId: item._id });
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('AVAILABILITY_TOGGLE');
      expect(logs[0].actorType).toBe('STAFF');
      expect(logs[0].newAvailability).toBe(false);

      // Manager toggles back to available
      const resMgr = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/menu-items/${item._id}/availability`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ isAvailable: true });

      expect(resMgr.status).toBe(200);
      expect(resMgr.body.data.isAvailable).toBe(true);
    });

    it('blocks Staff role from performing manual stock adjustments (Manager only)', async () => {
      const item = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Truffle Fries',
        price: 35000,
        isAvailable: true,
      });

      // Staff tries manual stock adjustment -> 403 Forbidden
      const resStaff = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/menu-items/${item._id}/stock`)
        .set('Authorization', `Bearer ${staffAToken}`)
        .send({ trackStock: true, stockQuantity: 50, lowStockThreshold: 10 });

      expect(resStaff.status).toBe(403);

      // Manager manual stock adjustment -> 200 Success
      const resMgr = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/menu-items/${item._id}/stock`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ trackStock: true, stockQuantity: 50, lowStockThreshold: 10 });

      expect(resMgr.status).toBe(200);
      expect(resMgr.body.data.trackStock).toBe(true);
      expect(resMgr.body.data.stockQuantity).toBe(50);
      expect(resMgr.body.data.lowStockThreshold).toBe(10);
    });
  });

  describe('Stock Depletion & Auto 86 on Zero Stock', () => {
    it('decrements stock count on order creation and auto-marks item unavailable at stock 0', async () => {
      const item = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Limited Burger',
        price: 40000,
        isAvailable: true,
        trackStock: true,
        stockQuantity: 2,
        lowStockThreshold: 1,
      });

      // Order 1 unit via Dine-In Mode
      const orderRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/tables/${tableAToken}/orders`)
        .send({
          items: [{ itemId: item._id.toString(), quantity: 1 }],
        });

      expect(orderRes.status).toBe(201);

      let updatedItem = await MenuItem.findById(item._id);
      expect(updatedItem?.stockQuantity).toBe(1);
      expect(updatedItem?.isAvailable).toBe(true);

      // Order second unit (depleting to 0)
      const orderRes2 = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/tables/${tableAToken}/orders`)
        .send({
          items: [{ itemId: item._id.toString(), quantity: 1 }],
        });

      expect([200, 201].includes(orderRes2.status)).toBe(true);

      updatedItem = await MenuItem.findById(item._id);
      expect(updatedItem?.stockQuantity).toBe(0);
      expect(updatedItem?.isAvailable).toBe(false); // Auto 86!

      // Attempting third order -> Rejected 400 ITEMS_UNAVAILABLE
      const orderRes3 = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/tables/${tableAToken}/orders`)
        .send({
          items: [{ itemId: item._id.toString(), quantity: 1 }],
        });

      expect(orderRes3.status).toBe(400);
      expect(orderRes3.body.error.code).toBe('ITEMS_UNAVAILABLE');
    }, 15000);
  });

  describe('Order Rejection across all 4 Ordering Modes', () => {
    let unavailableItem: any;

    beforeEach(async () => {
      unavailableItem = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Sold Out Special',
        price: 30000,
        isAvailable: false,
      });
    });

    it('rejects Dine-In mode orders for unavailable items', async () => {
      const res = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/tables/${tableAToken}/orders`)
        .send({ items: [{ itemId: unavailableItem._id.toString(), quantity: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ITEMS_UNAVAILABLE');
    });

    it('rejects Takeaway mode orders for unavailable items', async () => {
      const res = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/orders`)
        .send({
          orderMode: 'TAKEAWAY',
          customerName: 'Takeaway Customer',
          customerPhone: '9876543210',
          items: [{ itemId: unavailableItem._id.toString(), quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ITEMS_UNAVAILABLE');
    });

    it('rejects Delivery mode orders for unavailable items', async () => {
      const res = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/orders`)
        .send({
          orderMode: 'DELIVERY',
          customerName: 'Delivery Customer',
          customerPhone: '9876543210',
          deliveryAddress: { street: '123 Main St', city: 'Metropolis', postalCode: '10001' },
          items: [{ itemId: unavailableItem._id.toString(), quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ITEMS_UNAVAILABLE');
    });

    it('rejects Counter POS mode orders for unavailable items', async () => {
      const res = await request(app)
        .post(`/api/v1/restaurants/${restAId}/orders/counter`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          items: [{ itemId: unavailableItem._id.toString(), quantity: 1 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ITEMS_UNAVAILABLE');
    });
  });

  describe('Race Condition & Concurrency Test (No Overselling)', () => {
    it('handles near-simultaneous order placements against 1 remaining stock unit without overselling', async () => {
      const rareItem = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Last Slice Cheesecake',
        price: 50000,
        isAvailable: true,
        trackStock: true,
        stockQuantity: 1,
      });

      // Simulate 5 simultaneous order requests attempting to buy the 1 remaining slice
      const requests = Array.from({ length: 5 }).map(() =>
        request(app)
          .post(`/api/v1/public/restaurants/${restaurantASlug}/tables/${tableAToken}/orders`)
          .send({ items: [{ itemId: rareItem._id.toString(), quantity: 1 }] })
      );

      const responses = await Promise.all(requests);

      const successfulOrders = responses.filter((r) => r.status === 201);
      const rejectedOrders = responses.filter((r) => r.status === 400 && r.body.error?.code === 'ITEMS_UNAVAILABLE');

      expect(successfulOrders.length).toBe(1);
      expect(rejectedOrders.length).toBe(4);

      const finalItem = await MenuItem.findById(rareItem._id);
      expect(finalItem?.stockQuantity).toBe(0);
      expect(finalItem?.isAvailable).toBe(false);
    });
  });

  describe('Tenant Isolation & Regression Integrity', () => {
    it('ensures Restaurant A stock changes never affect Restaurant B menu items', async () => {
      const categoryB = await Category.create({
        restaurantId: restBId,
        name: 'Sides',
        sortOrder: 1,
        isActive: true,
      });

      const itemA = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Fries A',
        price: 10000,
        isAvailable: true,
        trackStock: true,
        stockQuantity: 10,
      });

      const itemB = await MenuItem.create({
        restaurantId: restBId,
        categoryId: categoryB._id,
        name: 'Fries B',
        price: 10000,
        isAvailable: true,
        trackStock: true,
        stockQuantity: 10,
      });

      // Manager A toggles item A to unavailable & updates stock
      await request(app)
        .patch(`/api/v1/restaurants/${restAId}/menu-items/${itemA._id}/stock`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ trackStock: true, stockQuantity: 0, isAvailable: false });

      const recheckedB = await MenuItem.findById(itemB._id);
      expect(recheckedB?.stockQuantity).toBe(10);
      expect(recheckedB?.isAvailable).toBe(true);
    });

    it('verifies KDS ticket status transitions do NOT re-decrement stock', async () => {
      const kdsItem = await MenuItem.create({
        restaurantId: restAId,
        categoryId: categoryAId,
        name: 'Pasta KDS',
        price: 45000,
        isAvailable: true,
        trackStock: true,
        stockQuantity: 10,
      });

      // Place order -> stock decrements from 10 to 9
      const orderRes = await request(app)
        .post(`/api/v1/public/restaurants/${restaurantASlug}/tables/${tableAToken}/orders`)
        .send({ items: [{ itemId: kdsItem._id.toString(), quantity: 1 }] });

      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.data._id;

      let checkItem = await MenuItem.findById(kdsItem._id);
      expect(checkItem?.stockQuantity).toBe(9);

      // KDS status transition: update item status to READY
      const kdsRes = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/kds/tickets/${orderId}/items/0/status`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ itemStatus: 'READY' });

      expect(kdsRes.status).toBe(200);

      // Verify stock quantity remains 9 and did NOT re-decrement
      checkItem = await MenuItem.findById(kdsItem._id);
      expect(checkItem?.stockQuantity).toBe(9);
    });
  });
});
