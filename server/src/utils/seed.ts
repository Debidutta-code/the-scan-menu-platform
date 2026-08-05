import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { RestaurantStats } from '../models/RestaurantStats';
import { RestaurantOnboarding } from '../models/RestaurantOnboarding';
import { Counter } from '../models/Counter';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Table } from '../models/Table';
import { TableZone } from '../models/TableZone';
import { featureFlagService } from '../services/featureFlag.service';
import { Tax } from '../models/Tax';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Order, OrderCounter } from '../models/Order';
import { TableSession } from '../models/TableSession';
import { WaiterCall } from '../models/WaiterCall';
import { IntegrationSyncLog } from '../models/IntegrationSyncLog';
import { ApiKey } from '../models/ApiKey';
import { WebhookSubscription } from '../models/WebhookSubscription';
import { logger } from './logger';

dotenv.config();

const ADMIN_EMAIL = 'admin@pixora.dev';
const ADMIN_PASSWORD = 'PixoraDemo123!';

const MANAGER_EMAIL = 'manager@democafe.com';
const STAFF1_EMAIL = 'staff1@democafe.com';
const STAFF2_EMAIL = 'staff2@democafe.com';
const DEMO_PASSWORD = 'PixoraDemo123!';

export const seedDatabase = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr';

  try {
    logger.info('Connecting to database for seeding...');
    await mongoose.connect(mongoURI);

    // 1. Seed Subscription Plans
    logger.info('Seeding Subscription Plans...');
    const subscriptionPlansData = [
      {
        key: 'FREE',
        name: 'Free Plan',
        description: 'Basic QR Menu browsing without online ordering.',
        includedFeatureKeys: ['qr_menu'],
      },
      {
        key: 'STARTER',
        name: 'Starter Plan',
        description: 'QR Menu, Waiter Call, and Basic Dine-In Ordering.',
        includedFeatureKeys: ['qr_menu', 'ordering', 'waiter_call'],
      },
      {
        key: 'PROFESSIONAL',
        name: 'Professional Plan',
        description: 'Full Dine-In & Takeaway ordering, Payments, and Analytics.',
        includedFeatureKeys: ['qr_menu', 'ordering', 'waiter_call', 'payments', 'analytics', 'inventory'],
      },
      {
        key: 'ENTERPRISE',
        name: 'Enterprise Plan',
        description: 'All features including KDS, White Labeling, POS Integrations, and Developer API.',
        includedFeatureKeys: [
          'qr_menu',
          'ordering',
          'waiter_call',
          'payments',
          'kds',
          'inventory',
          'analytics',
          'white_label',
          'api_webhooks',
          'pos_integration',
        ],
      },
    ];

    for (const plan of subscriptionPlansData) {
      await SubscriptionPlan.findOneAndUpdate(
        { key: plan.key },
        { $set: plan },
        { upsert: true, new: true }
      );
    }
    logger.info('Subscription Plans seeded successfully.');

    // 2. Seed SUPER_ADMIN idempotently
    logger.info('Checking for existing SUPER_ADMIN user...');
    let superAdmin = await User.findOne({
      $or: [{ role: 'SUPER_ADMIN' }, { email: ADMIN_EMAIL.toLowerCase() }],
    });

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (!superAdmin) {
      superAdmin = new User({
        email: ADMIN_EMAIL,
        passwordHash: hashedPassword,
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
        isActive: true,
      });
      await superAdmin.save();
      logger.info('SUPER_ADMIN created successfully.');
    } else {
      logger.info(`SUPER_ADMIN already exists: ${superAdmin.email}.`);
    }

    // Initialize Counter if not exists
    let counter = await Counter.findOne({ name: 'restaurant_code' });
    if (!counter) {
      counter = new Counter({ name: 'restaurant_code', seq: 1 });
      await counter.save();
    }

    // 3. Seed "Demo Cafe" Restaurant idempotently
    logger.info('Checking for existing "Demo Cafe" restaurant...');
    let restaurant = await Restaurant.findOne({ slug: 'demo-cafe' });
    if (!restaurant) {
      restaurant = new Restaurant({
        code: 'RST-000001',
        name: 'Demo Cafe',
        slug: 'demo-cafe',
        status: 'ACTIVE',
        description: 'A charming, high-performance coffee and dining spot.',
        phone: '+91 9999999999',
        email: 'info@democafe.com',
        address: '123 Espresso Boulevard, Bangalore, Karnataka',
        subscription: {
          status: 'ACTIVE',
          planKey: 'ENTERPRISE',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      await restaurant.save();
      logger.info('Restaurant "Demo Cafe" created successfully.');
    } else {
      if (!restaurant.code) {
        restaurant.code = 'RST-000001';
      }
      restaurant.subscription = {
        status: 'ACTIVE',
        planKey: 'ENTERPRISE',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
      await restaurant.save();
      logger.info('"Demo Cafe" restaurant updated with Enterprise subscription.');
    }

    // Seed RestaurantSettings, Stats, Onboarding & White Labeling
    let settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });
    if (!settings) {
      settings = new RestaurantSettings({
        restaurantId: restaurant._id,
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        paymentConfig: {
          taxRatePercent: 5.0,
          paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
          integrationConfig: { provider: 'PETPOOJA', config: { outletId: 'democafe_01', enabled: true } },
          gstNumber: '29ABCDE1234F1Z5',
        },
        workflow: {
          orderWorkflowMode: 'FIVE_STEP',
          autoAcceptConfig: { enabled: false, delaySeconds: 10 },
        },
        timings: { open: '08:00', close: '23:00' },
        branding: {
          googleReviewUrl: 'https://g.page/r/democafe-reviews',
          whatsapp: '+919999999999',
          socialLinks: { facebook: 'https://fb.com/democafe', instagram: 'https://instagr.am/democafe' },
        },
        theme: { primaryColor: '#111827', secondaryColor: '#FFFFFF', accentColor: '#F59E0B', fontFamily: 'Plus Jakarta Sans' },
        whiteLabelConfig: {
          primaryColor: '#111827',
          fontFamily: 'Plus Jakarta Sans',
          hidePoweredBy: false,
        },
      });
      await settings.save();
    }

    let stats = await RestaurantStats.findOne({ restaurantId: restaurant._id });
    if (!stats) {
      stats = new RestaurantStats({ restaurantId: restaurant._id });
      await stats.save();
    }

    let onboarding = await RestaurantOnboarding.findOne({ restaurantId: restaurant._id });
    if (!onboarding) {
      onboarding = new RestaurantOnboarding({
        restaurantId: restaurant._id,
        restaurantCreated: true,
        managerCreated: true,
        tablesCreated: true,
        menuImported: true,
        paymentsConfigured: true,
        subscriptionAssigned: true,
        completed: true,
      });
      await onboarding.save();
    }

    // 4. Seed Manager & Staff users idempotently
    const demoHashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    // Manager
    let manager = await User.findOne({ email: MANAGER_EMAIL });
    if (!manager) {
      manager = new User({
        email: MANAGER_EMAIL,
        passwordHash: demoHashedPassword,
        role: 'MANAGER',
        name: 'Demo Manager',
        isActive: true,
      });
      await manager.save();
      logger.info(`Manager account created: ${MANAGER_EMAIL}`);
    }

    const existingStaffManager = await RestaurantStaff.findOne({
      userId: manager._id,
      restaurantId: restaurant._id,
    });
    if (!existingStaffManager) {
      await RestaurantStaff.create({
        userId: manager._id,
        restaurantId: restaurant._id,
        role: 'MANAGER',
        isActive: true,
      });
      logger.info('Linked Manager to "Demo Cafe".');
    }

    // Staff 1
    let staff1 = await User.findOne({ email: STAFF1_EMAIL });
    if (!staff1) {
      staff1 = new User({
        email: STAFF1_EMAIL,
        passwordHash: demoHashedPassword,
        role: 'STAFF',
        name: 'Demo Staff One',
        isActive: true,
      });
      await staff1.save();
      logger.info(`Staff 1 account created: ${STAFF1_EMAIL}`);
    }

    const existingStaff1Join = await RestaurantStaff.findOne({
      userId: staff1._id,
      restaurantId: restaurant._id,
    });
    if (!existingStaff1Join) {
      await RestaurantStaff.create({
        userId: staff1._id,
        restaurantId: restaurant._id,
        role: 'STAFF',
        isActive: true,
      });
      logger.info('Linked Staff One to "Demo Cafe".');
    }

    // Staff 2
    let staff2 = await User.findOne({ email: STAFF2_EMAIL });
    if (!staff2) {
      staff2 = new User({
        email: STAFF2_EMAIL,
        passwordHash: demoHashedPassword,
        role: 'STAFF',
        name: 'Demo Staff Two',
        isActive: true,
      });
      await staff2.save();
      logger.info(`Staff 2 account created: ${STAFF2_EMAIL}`);
    }

    const existingStaff2Join = await RestaurantStaff.findOne({
      userId: staff2._id,
      restaurantId: restaurant._id,
    });
    if (!existingStaff2Join) {
      await RestaurantStaff.create({
        userId: staff2._id,
        restaurantId: restaurant._id,
        role: 'STAFF',
        isActive: true,
      });
      logger.info('Linked Staff Two to "Demo Cafe".');
    }

    // 5. Seed Taxes & Table Zones
    logger.info('Seeding taxes...');
    const taxesData = [
      { name: 'CGST', percentage: 2.5 },
      { name: 'SGST', percentage: 2.5 },
    ];
    for (const tax of taxesData) {
      const existingTax = await Tax.findOne({ restaurantId: restaurant._id, name: tax.name });
      if (!existingTax) {
        await Tax.create({
          restaurantId: restaurant._id,
          name: tax.name,
          percentage: tax.percentage,
          isActive: true,
        });
      }
    }

    logger.info('Seeding table zones...');
    const zonesData = ['Indoor Dining', 'Outdoor Patio'];
    const createdZones = [];
    for (const zoneName of zonesData) {
      let zone = await TableZone.findOne({ restaurantId: restaurant._id, name: zoneName });
      if (!zone) {
        zone = await TableZone.create({
          restaurantId: restaurant._id,
          name: zoneName,
          isActive: true,
        });
      }
      createdZones.push(zone);
    }
    const indoorZone = createdZones.find((z) => z.name === 'Indoor Dining');
    const outdoorZone = createdZones.find((z) => z.name === 'Outdoor Patio');

    // 6. Seed Tables idempotently per zone
    logger.info('Seeding tables...');
    try {
      await Table.collection.dropIndex('restaurantId_1_tableNumber_1');
    } catch (err) {
      // Legacy index missing
    }
    await Table.syncIndexes();

    const tablesData = [
      { num: '1', name: 'Table 1 (Window Side)', zoneId: indoorZone?._id },
      { num: '2', name: 'Table 2 (Lounge)', zoneId: indoorZone?._id },
      { num: '3', name: 'Table 3 (Bar Side)', zoneId: indoorZone?._id },
      { num: '1', name: 'Table 1 (Terrace)', zoneId: outdoorZone?._id },
      { num: '2', name: 'Table 2 (VIP Cabin)', zoneId: outdoorZone?._id },
    ];

    const seededTables: any[] = [];
    for (const t of tablesData) {
      if (!t.zoneId) continue;
      let existingTable = await Table.findOne({
        restaurantId: restaurant._id,
        zoneId: t.zoneId,
        tableNumber: t.num,
      });
      if (!existingTable) {
        const token = `secureTableTokenDemoCafeZone${t.zoneId}Number${t.num}XYZ`;
        existingTable = await Table.create({
          restaurantId: restaurant._id,
          zoneId: t.zoneId,
          tableNumber: t.num,
          displayName: t.name,
          token,
          qrCodeUrl: `/api/v1/restaurants/${restaurant._id}/tables/${token}/qr`,
          isActive: true,
        });
        logger.info(`Table ${t.num} in zone seeded.`);
      } else {
        existingTable.displayName = t.name;
        await existingTable.save();
      }
      seededTables.push(existingTable);
    }

    // 7. Seed 5 Categories & 20 Menu Items with Inventory Stock Tracking
    logger.info('Seeding categories...');
    const catsData = [
      { name: 'Coffee Specialties', order: 0 },
      { name: 'House Baked Pizzas', order: 1 },
      { name: 'Gourmet Sliders', order: 2 },
      { name: 'Artisanal Desserts', order: 3 },
      { name: 'Refreshing Tonics', order: 4 },
    ];

    const categoryMap: Record<string, any> = {};

    for (const c of catsData) {
      let cat = await Category.findOne({
        restaurantId: restaurant._id,
        name: c.name,
      });
      if (!cat) {
        cat = new Category({
          restaurantId: restaurant._id,
          name: c.name,
          sortOrder: c.order,
          isActive: true,
        });
        await cat.save();
        logger.info(`Category "${c.name}" seeded.`);
      }
      categoryMap[c.name] = cat._id;
    }

    logger.info('Seeding menu items with stock tracking...');
    const itemsData = [
      // 1. Coffee
      { cat: 'Coffee Specialties', name: 'Madras Filter Coffee', price: 12000, veg: true, spicy: false, prep: 4, trackStock: true, stock: 50, lowStock: 10 },
      { cat: 'Coffee Specialties', name: 'Nutella Mocha Latte', price: 21000, veg: true, spicy: false, prep: 5, trackStock: true, stock: 25, lowStock: 5 },
      { cat: 'Coffee Specialties', name: 'Single Origin Espresso', price: 15000, veg: true, spicy: false, prep: 3, trackStock: false, stock: 0, lowStock: 0 },
      { cat: 'Coffee Specialties', name: 'Cold Brew on Draft', price: 18000, veg: true, spicy: false, prep: 3, trackStock: true, stock: 4, lowStock: 5 }, // Trigger low stock!
      // 2. Pizzas
      { cat: 'House Baked Pizzas', name: 'Classic Margherita Sourdough', price: 44900, veg: true, spicy: false, prep: 12, trackStock: true, stock: 30, lowStock: 5 },
      { cat: 'House Baked Pizzas', name: 'Spicy Paneer Tikka Furnace Pizza', price: 54900, veg: true, spicy: true, prep: 15, trackStock: true, stock: 18, lowStock: 5 },
      { cat: 'House Baked Pizzas', name: 'Garden Pesto & Mushroom Pizza', price: 49900, veg: true, spicy: false, prep: 14, trackStock: false, stock: 0, lowStock: 0 },
      { cat: 'House Baked Pizzas', name: 'Hot Chili Pepper Double Cheese Pizza', price: 52900, veg: true, spicy: true, prep: 13, trackStock: true, stock: 20, lowStock: 5 },
      // 3. Sliders
      { cat: 'Gourmet Sliders', name: 'Crispy Veg Patty Brioche Slider', price: 29900, veg: true, spicy: false, prep: 10, trackStock: true, stock: 40, lowStock: 8 },
      { cat: 'Gourmet Sliders', name: 'Spiced Potato Masala Slider', price: 19900, veg: true, spicy: true, prep: 8, trackStock: true, stock: 35, lowStock: 5 },
      { cat: 'Gourmet Sliders', name: 'Paneer Firecracker Melt Slider', price: 32900, veg: true, spicy: true, prep: 11, trackStock: true, stock: 15, lowStock: 5 },
      { cat: 'Gourmet Sliders', name: 'Portobello Truffle Cheese Slider', price: 34900, veg: true, spicy: false, prep: 12, trackStock: false, stock: 0, lowStock: 0 },
      // 4. Desserts
      { cat: 'Artisanal Desserts', name: 'Woodfired Hot Fudge Skillet Cookie', price: 26000, veg: true, spicy: false, prep: 10, trackStock: true, stock: 12, lowStock: 3 },
      { cat: 'Artisanal Desserts', name: 'Saffron Pistachio Tres Leches', price: 32000, veg: true, spicy: false, prep: 6, trackStock: true, stock: 8, lowStock: 3 },
      { cat: 'Artisanal Desserts', name: 'Classic Tiramisu on Espresso Soak', price: 29000, veg: true, spicy: false, prep: 5, trackStock: false, stock: 0, lowStock: 0 },
      { cat: 'Artisanal Desserts', name: 'Salted Caramel Pecan Tart', price: 28000, veg: true, spicy: false, prep: 5, trackStock: true, stock: 10, lowStock: 3 },
      // 5. Tonics
      { cat: 'Refreshing Tonics', name: 'Cold Pressed Orange Zest Mojito', price: 16000, veg: true, spicy: false, prep: 4, trackStock: true, stock: 45, lowStock: 10 },
      { cat: 'Refreshing Tonics', name: 'Ginger Lemongrass Herbal Fizz', price: 14000, veg: true, spicy: false, prep: 4, trackStock: true, stock: 30, lowStock: 5 },
      { cat: 'Refreshing Tonics', name: 'Wild Berries Iced Hibiscus Tea', price: 15000, veg: true, spicy: false, prep: 3, trackStock: false, stock: 0, lowStock: 0 },
      { cat: 'Refreshing Tonics', name: 'Cucumber Cooler Basil Tonic', price: 13000, veg: true, spicy: false, prep: 4, trackStock: true, stock: 22, lowStock: 5 },
    ];

    const seededMenuItems: any[] = [];
    for (const [idx, item] of itemsData.entries()) {
      const catId = categoryMap[item.cat];
      if (!catId) continue;

      let menuItem = await MenuItem.findOne({
        restaurantId: restaurant._id,
        name: item.name,
      });

      if (!menuItem) {
        menuItem = await MenuItem.create({
          restaurantId: restaurant._id,
          categoryId: catId,
          name: item.name,
          description: `Signature delicious house specialty ${item.name.toLowerCase()} prepared fresh.`,
          price: item.price,
          isAvailable: true,
          isVegetarian: item.veg,
          isSpicy: item.spicy,
          prepTimeMinutes: item.prep,
          trackStock: item.trackStock,
          stockQuantity: item.stock,
          lowStockThreshold: item.lowStock,
          sortOrder: idx,
          addOns: [{ name: 'Extra Portion', priceDelta: 4000 }],
        });
        logger.info(`Menu Item "${item.name}" seeded.`);
      } else {
        menuItem.trackStock = item.trackStock;
        menuItem.stockQuantity = item.stock;
        menuItem.lowStockThreshold = item.lowStock;
        await menuItem.save();
      }
      seededMenuItems.push(menuItem);
    }

    // 8. Seed Sample Active Orders for KDS, Live Orders & Analytics
    logger.info('Seeding sample active orders & kitchen tickets...');
    let orderCounter = await OrderCounter.findOne({ restaurantId: restaurant._id });
    if (!orderCounter) {
      orderCounter = new OrderCounter({ restaurantId: restaurant._id, seq: 100 });
      await orderCounter.save();
    }

    const sampleOrdersData = [
      {
        orderNumber: 101,
        table: seededTables[0],
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PENDING',
        paymentStatus: 'PAID',
        item: seededMenuItems[0],
        qty: 2,
      },
      {
        orderNumber: 102,
        table: seededTables[1],
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PREPARING',
        paymentStatus: 'PAID',
        item: seededMenuItems[4],
        qty: 1,
      },
      {
        orderNumber: 103,
        table: seededTables[2],
        mode: 'COUNTER',
        source: 'POS',
        status: 'READY',
        paymentStatus: 'PAID',
        item: seededMenuItems[8],
        qty: 3,
      },
      {
        orderNumber: 104,
        table: seededTables[3],
        mode: 'TAKEAWAY',
        source: 'MANUAL',
        status: 'SERVED',
        paymentStatus: 'PAID',
        item: seededMenuItems[12],
        qty: 2,
      },
    ];

    for (const ord of sampleOrdersData) {
      let existingOrder = await Order.findOne({ restaurantId: restaurant._id, orderNumber: ord.orderNumber });
      if (!existingOrder && ord.table && ord.item) {
        const subtotal = ord.item.price * ord.qty;
        const taxAmount = Math.round(subtotal * 0.05);
        const total = subtotal + taxAmount;

        const session = await TableSession.create({
          restaurantId: restaurant._id,
          tableId: ord.table._id,
          status: ord.status === 'SERVED' ? 'CLOSED' : 'OPEN',
          roundCount: 1,
          subtotal,
          tax: taxAmount,
          total,
        });

        existingOrder = await Order.create({
          restaurantId: restaurant._id,
          orderNumber: ord.orderNumber,
          sessionId: session._id,
          tableId: ord.table._id,
          tableNameSnapshot: ord.table.displayName,
          orderMode: ord.mode,
          orderSource: ord.source,
          status: ord.status,
          paymentStatus: ord.paymentStatus,
          subtotal,
          tax: taxAmount,
          total,
          taxBreakdown: [
            { name: 'CGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
            { name: 'SGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
          ],
          items: [
            {
              menuItemId: ord.item._id,
              nameSnapshot: ord.item.name,
              unitPriceSnapshot: ord.item.price,
              quantity: ord.qty,
              selectedAddOns: [],
              itemStatus: ord.status === 'SERVED' ? 'SERVED' : ord.status === 'READY' ? 'READY' : ord.status === 'PREPARING' ? 'PREPARING' : 'PENDING',
            },
          ],
        });
        logger.info(`Sample order ORD-${ord.orderNumber} seeded.`);
      }
    }

    // 9. Seed Waiter Calls for Notification Testing
    logger.info('Seeding sample waiter calls...');
    if (seededTables[0]) {
      const existingCall = await WaiterCall.findOne({ restaurantId: restaurant._id, tableId: seededTables[0]._id, status: 'PENDING' });
      if (!existingCall) {
        await WaiterCall.create({
          restaurantId: restaurant._id,
          tableId: seededTables[0]._id,
          tableNumberSnapshot: seededTables[0].displayName,
          status: 'PENDING',
          requestType: 'CALL_WAITER',
        });
        logger.info('Sample Waiter Call seeded for Table 1.');
      }
    }

    // 10. Seed Integration Sync Logs for Petpooja POS
    logger.info('Seeding POS Integration Sync Audit Logs...');
    const syncLogCheck = await IntegrationSyncLog.findOne({ restaurantId: restaurant._id });
    if (!syncLogCheck) {
      await IntegrationSyncLog.create([
        {
          restaurantId: restaurant._id,
          provider: 'PETPOOJA',
          operation: 'SYNC_MENU',
          status: 'SUCCESS',
          syncAttempts: 1,
          errorMessage: 'Catalog menu (20 items, 5 categories) synchronized successfully.',
        },
        {
          restaurantId: restaurant._id,
          provider: 'PETPOOJA',
          operation: 'PUSH_ORDER',
          status: 'SUCCESS',
          syncAttempts: 1,
          errorMessage: 'Order ORD-103 pushed to Petpooja POS billing system.',
        },
      ]);
      logger.info('POS Sync Audit Logs seeded.');
    }

    // 11. Seed API Keys & Webhook Subscriptions for Developer Portal
    logger.info('Seeding Developer API Keys & Webhook Subscriptions...');
    const existingApiKey = await ApiKey.findOne({ restaurantId: restaurant._id });
    if (!existingApiKey) {
      const rawDemoKey = 'tsm_live_demokey1234567890abcdef1234567890abcdef';
      const keyHash = crypto.createHash('sha256').update(rawDemoKey).digest('hex');
      await ApiKey.create({
        restaurantId: restaurant._id,
        name: 'POS & Mobile Integration Key',
        keyPrefix: 'tsm_live_demo',
        keyHash,
        scopes: ['menu:read', 'orders:read', 'orders:write', 'webhooks:manage'],
        isActive: true,
      });
      logger.info('Demo Developer API Key seeded.');
    }

    const existingWebhook = await WebhookSubscription.findOne({ restaurantId: restaurant._id });
    if (!existingWebhook) {
      await WebhookSubscription.create({
        restaurantId: restaurant._id,
        targetUrl: 'https://webhook.site/pixora-demo-listener',
        events: ['order.created', 'order.status_updated', 'inventory.low_stock'],
        secret: 'whsec_demo_secret_key_12345',
        isActive: true,
        failureCount: 0,
        deliveryLogs: [
          {
            event: 'order.created',
            payload: { orderNumber: 'ORD-101', total: 25200 },
            responseStatus: 200,
            attempts: 1,
            deliveredAt: new Date(),
          },
        ],
      });
      logger.info('Demo Webhook Subscription seeded.');
    }

    // 12. Seed Feature Flags and enable all ENTERPRISE flags for Demo Cafe
    logger.info('Seeding & Enabling all ENTERPRISE Feature Flags...');
    await featureFlagService.getRestaurantFlags(restaurant._id);

    const enterpriseFlags = [
      'qr_menu',
      'ordering',
      'waiter_call',
      'payments',
      'kds',
      'inventory',
      'analytics',
      'white_label',
      'api_webhooks',
      'pos_integration',
    ];
    await featureFlagService.bulkUpdate(
      restaurant._id,
      enterpriseFlags.map((key) => ({ key, enabled: true }))
    );
    logger.info(`All ${enterpriseFlags.length} ENTERPRISE Feature Flags enabled for Demo Cafe.`);

    logger.info('--------------------------------------------------');
    logger.info('IDEMPOTENT SEED DATA CREATED SUCCESSFULLY!');
    logger.info(`SUPER ADMIN Email: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    logger.info(`DEMO RESTAURANT SLUG: demo-cafe`);
    logger.info(`DEMO MANAGER Email: ${MANAGER_EMAIL} / ${DEMO_PASSWORD}`);
    logger.info(`DEMO STAFF 1 Email: ${STAFF1_EMAIL} / ${DEMO_PASSWORD}`);
    logger.info(`DEMO STAFF 2 Email: ${STAFF2_EMAIL} / ${DEMO_PASSWORD}`);
    logger.info('--------------------------------------------------');
  } catch (error) {
    logger.error(error, 'Error seeding database');
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database.');
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
export default seedDatabase;
