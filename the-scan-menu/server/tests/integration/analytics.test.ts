process.env.TESTING_FEATURE_FLAGS = 'true';

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index';
import { Order } from '../../src/models/Order';
import { MenuItem } from '../../src/models/MenuItem';
import { Category } from '../../src/models/Category';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { User } from '../../src/models/User';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { featureFlagService } from '../../src/services/featureFlag.service';
import { analyticsService } from '../../src/services/analytics.service';
import { tokenService } from '../../src/services/token.service';

describe('Phase 13 Analytics & Reporting Test Suite', () => {
  let restAId: string;
  let restBId: string;
  let managerAToken: string;
  let staffAToken: string;
  let managerBToken: string;
  let item1Id: string;
  let item2Id: string;
  let item3Id: string;

  const generateAccessToken = (user: any) => {
    return tokenService.generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr-test');
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Order.deleteMany({});
    await MenuItem.deleteMany({});
    await Category.deleteMany({});
    await Restaurant.deleteMany({});
    await RestaurantSettings.deleteMany({});
    await User.deleteMany({});
    await RestaurantStaff.deleteMany({});

    // Create Restaurant A
    const restA = await Restaurant.create({
      code: 'RST-ANALYTICS-A',
      name: 'Analytics Grill',
      slug: 'analytics-grill',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restAId = restA._id.toString();

    await RestaurantSettings.create({
      restaurantId: restA._id,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });

    // Enable analytics feature flag for Restaurant A
    await featureFlagService.enable(restAId, 'analytics');
    await featureFlagService.enable(restAId, 'ordering');

    // Create Restaurant B (for tenant isolation testing)
    const restB = await Restaurant.create({
      code: 'RST-ANALYTICS-B',
      name: 'Isolation Bistro',
      slug: 'isolation-bistro',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restBId = restB._id.toString();
    await featureFlagService.enable(restBId, 'analytics');

    // Users & Tokens
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const mgrA = await User.create({
      name: 'Manager A',
      email: 'manager.a@analytics.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
    });
    await RestaurantStaff.create({
      restaurantId: restA._id,
      userId: mgrA._id,
      role: 'MANAGER',
      isActive: true,
    });
    managerAToken = generateAccessToken(mgrA);

    const stfA = await User.create({
      name: 'Staff A',
      email: 'staff.a@analytics.com',
      passwordHash: hashedPassword,
      role: 'STAFF',
    });
    await RestaurantStaff.create({
      restaurantId: restA._id,
      userId: stfA._id,
      role: 'STAFF',
      isActive: true,
    });
    staffAToken = generateAccessToken(stfA);

    const mgrB = await User.create({
      name: 'Manager B',
      email: 'manager.b@analytics.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
    });
    await RestaurantStaff.create({
      restaurantId: restB._id,
      userId: mgrB._id,
      role: 'MANAGER',
      isActive: true,
    });
    managerBToken = generateAccessToken(mgrB);

    // Setup Category and Menu Items for Rest A
    const cat = await Category.create({
      restaurantId: restA._id,
      name: 'Mains',
      sortOrder: 1,
    });

    const item1 = await MenuItem.create({
      restaurantId: restA._id,
      categoryId: cat._id,
      name: 'Butter Chicken',
      price: 45000, // 450 INR
      isAvailable: true,
      isArchived: false,
    });
    item1Id = item1._id.toString();

    const item2 = await MenuItem.create({
      restaurantId: restA._id,
      categoryId: cat._id,
      name: 'Paneer Tikka',
      price: 32000, // 320 INR
      isAvailable: false, // 86'd / unavailable
      isArchived: false,
    });
    item2Id = item2._id.toString();

    const item3 = await MenuItem.create({
      restaurantId: restA._id,
      categoryId: cat._id,
      name: 'Old Legacy Dish',
      price: 25000,
      isAvailable: false,
      isArchived: true, // Archived
    });
    item3Id = item3._id.toString();
  });

  describe('Revenue Calculation & Order Exclusions', () => {
    it('correctly calculates total revenue excluding cancelled, unpaid, and failed orders', async () => {
      const now = new Date();

      // 1. Paid & Served Order -> 50000 paise (500 INR)
      await Order.create({
        restaurantId: restAId,
        orderMode: 'DINE_IN',
        orderNumber: 101,
        items: [{ menuItemId: item1Id, nameSnapshot: 'Butter Chicken', unitPriceSnapshot: 45000, quantity: 1, itemStatus: 'SERVED' }],
        subtotal: 45000,
        tax: 5000,
        taxBreakdown: [],
        total: 50000,
        status: 'SERVED',
        source: 'QR',
        paymentStatus: 'PAID',
        integrationMetadata: {},
        createdAt: now,
      });

      // 2. Paid & Accepted Order -> 30000 paise (300 INR)
      await Order.create({
        restaurantId: restAId,
        orderMode: 'TAKEAWAY',
        orderNumber: 102,
        items: [{ menuItemId: item2Id, nameSnapshot: 'Paneer Tikka', unitPriceSnapshot: 30000, quantity: 1, itemStatus: 'PENDING' }],
        subtotal: 30000,
        tax: 0,
        taxBreakdown: [],
        total: 30000,
        status: 'ACCEPTED',
        source: 'POS',
        paymentStatus: 'PAID',
        integrationMetadata: {},
        createdAt: now,
      });

      // 3. Cancelled Order (was 40000 paise, paid=PAID but status=CANCELLED) -> MUST BE EXCLUDED
      await Order.create({
        restaurantId: restAId,
        orderMode: 'DELIVERY',
        orderNumber: 103,
        items: [{ menuItemId: item1Id, nameSnapshot: 'Butter Chicken', unitPriceSnapshot: 40000, quantity: 1, itemStatus: 'PENDING' }],
        subtotal: 40000,
        tax: 0,
        taxBreakdown: [],
        total: 40000,
        status: 'CANCELLED',
        source: 'QR',
        paymentStatus: 'PAID',
        integrationMetadata: {},
        createdAt: now,
      });

      // 4. Unpaid Pending Order -> paymentStatus: 'PENDING' -> MUST BE EXCLUDED FROM REVENUE
      await Order.create({
        restaurantId: restAId,
        orderMode: 'DINE_IN',
        orderNumber: 104,
        items: [{ menuItemId: item1Id, nameSnapshot: 'Butter Chicken', unitPriceSnapshot: 45000, quantity: 1, itemStatus: 'PENDING' }],
        subtotal: 45000,
        tax: 0,
        taxBreakdown: [],
        total: 45000,
        status: 'PENDING',
        source: 'QR',
        paymentStatus: 'PENDING',
        integrationMetadata: {},
        createdAt: now,
      });

      const summary = await analyticsService.getSummary(restAId);

      // Expected revenue = 50000 + 30000 = 80000
      expect(summary.current.revenue).toBe(80000);
      expect(summary.current.paidOrderCount).toBe(2);
      expect(summary.current.cancelledOrderCount).toBe(1);
      expect(summary.current.orderCount).toBe(4);
      expect(summary.current.averageOrderValue).toBe(40000); // 80000 / 2
    });

    it('counts Petpooja-relayed orders exactly once across report aggregations', async () => {
      const now = new Date();

      // Petpooja-relayed order stored as single Order with integrationMetadata.petpoojaOrderId
      await Order.create({
        restaurantId: restAId,
        orderMode: 'DINE_IN',
        orderNumber: 201,
        items: [{ menuItemId: item1Id, nameSnapshot: 'Butter Chicken', unitPriceSnapshot: 45000, quantity: 2, itemStatus: 'SERVED' }],
        subtotal: 90000,
        tax: 0,
        taxBreakdown: [],
        total: 90000,
        status: 'SERVED',
        source: 'POS',
        paymentStatus: 'PAID',
        integrationMetadata: {
          petpoojaOrderId: 'PP-201-XYZ',
          petpoojaSyncedAt: new Date().toISOString(),
          petpoojaStatus: 'SYNCED',
        },
        createdAt: now,
      });

      const summary = await analyticsService.getSummary(restAId);
      expect(summary.current.paidOrderCount).toBe(1);
      expect(summary.current.revenue).toBe(90000);
      expect(summary.sourceBreakdown.POS.count).toBe(1);
      expect(summary.sourceBreakdown.POS.revenue).toBe(90000);
    });
  });

  describe('Top Selling Items Reporting & Item Availability Badges', () => {
    it('returns top selling items with current availability and archive status badges', async () => {
      const now = new Date();

      // Order with active item1 (qty 5), 86'd item2 (qty 3), and archived item3 (qty 2)
      await Order.create({
        restaurantId: restAId,
        orderMode: 'COUNTER',
        orderNumber: 301,
        items: [
          { menuItemId: item1Id, nameSnapshot: 'Butter Chicken', unitPriceSnapshot: 45000, quantity: 5, itemStatus: 'SERVED' },
          { menuItemId: item2Id, nameSnapshot: 'Paneer Tikka', unitPriceSnapshot: 32000, quantity: 3, itemStatus: 'SERVED' },
          { menuItemId: item3Id, nameSnapshot: 'Old Legacy Dish', unitPriceSnapshot: 25000, quantity: 2, itemStatus: 'SERVED' },
        ],
        subtotal: 371000,
        tax: 0,
        taxBreakdown: [],
        total: 371000,
        status: 'SERVED',
        source: 'MANUAL',
        paymentStatus: 'PAID',
        integrationMetadata: {},
        createdAt: now,
      });

      const topItems = await analyticsService.getTopItems(restAId, undefined, undefined, 10, 'quantity');

      expect(topItems.length).toBe(3);

      // Rank 1: Butter Chicken (qty 5, isAvailable: true, isArchived: false)
      expect(topItems[0].name).toBe('Butter Chicken');
      expect(topItems[0].quantitySold).toBe(5);
      expect(topItems[0].isAvailable).toBe(true);
      expect(topItems[0].isArchived).toBe(false);

      // Rank 2: Paneer Tikka (qty 3, isAvailable: false, isArchived: false) -> 86'd item
      expect(topItems[1].name).toBe('Paneer Tikka');
      expect(topItems[1].quantitySold).toBe(3);
      expect(topItems[1].isAvailable).toBe(false);
      expect(topItems[1].isArchived).toBe(false);

      // Rank 3: Old Legacy Dish (qty 2, isAvailable: false, isArchived: true) -> Archived item
      expect(topItems[2].name).toBe('Old Legacy Dish');
      expect(topItems[2].quantitySold).toBe(2);
      expect(topItems[2].isAvailable).toBe(false);
      expect(topItems[2].isArchived).toBe(true);
    });
  });

  describe('Peak Hours & Timezone Handling', () => {
    it('groups order volume by hour in restaurant local timezone', async () => {
      const now = new Date();
      await Order.create({
        restaurantId: restAId,
        orderMode: 'DINE_IN',
        orderNumber: 401,
        items: [{ menuItemId: item1Id, nameSnapshot: 'Butter Chicken', unitPriceSnapshot: 45000, quantity: 1, itemStatus: 'SERVED' }],
        subtotal: 45000,
        tax: 0,
        taxBreakdown: [],
        total: 45000,
        status: 'SERVED',
        source: 'QR',
        paymentStatus: 'PAID',
        integrationMetadata: {},
        createdAt: now,
      });

      const peakHours = await analyticsService.getPeakHours(restAId);
      expect(peakHours.timezone).toBe('Asia/Kolkata');
      expect(peakHours.hourly.length).toBe(24);
      expect(peakHours.daily.length).toBe(7);

      const totalHourlyOrders = peakHours.hourly.reduce((sum, h) => sum + h.orderCount, 0);
      expect(totalHourlyOrders).toBe(1);
    });
  });

  describe('API Integration & Authorization Tests', () => {
    it('GET /summary returns operational metrics for Manager token', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/summary`)
        .set('Authorization', `Bearer ${managerAToken}`);

      if (res.status !== 200) {
        console.log('DEBUG GET /summary error body:', JSON.stringify(res.body));
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('current');
      expect(res.body.data).toHaveProperty('prior');
      expect(res.body.data).toHaveProperty('modeBreakdown');
      expect(res.body.data).toHaveProperty('sourceBreakdown');
    });

    it('GET /top-items returns top sellers for Manager token', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/top-items?limit=5&sortBy=quantity`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('blocks Staff token from accessing analytics endpoints (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/summary`)
        .set('Authorization', `Bearer ${staffAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('GET /peak-hours returns hourly distribution for Manager token', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/peak-hours`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('hourly');
      expect(res.body.data).toHaveProperty('daily');
    });

    it('enforces multi-tenant isolation — Manager B cannot access Restaurant A analytics', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/summary`)
        .set('Authorization', `Bearer ${managerBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('validates date range query parameters and returns 400 for invalid range', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/summary?startDate=2026-08-10&endDate=2026-08-01`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('blocks request if analytics feature flag is disabled for the restaurant', async () => {
      await featureFlagService.disable(restAId, 'analytics');

      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/analytics/summary`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
