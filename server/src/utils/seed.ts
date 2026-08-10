import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
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
import { Tax } from '../models/Tax';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Order, OrderCounter } from '../models/Order';
import { TableSession } from '../models/TableSession';
import { WaiterCall } from '../models/WaiterCall';
import { IntegrationSyncLog } from '../models/IntegrationSyncLog';
import { ApiKey } from '../models/ApiKey';
import { WebhookSubscription } from '../models/WebhookSubscription';
import { InventoryLog } from '../models/InventoryLog';
import { Transaction } from '../models/Transaction';
import { AuditLog } from '../models/AuditLog';
import { subscriptionService } from '../services/subscription.service';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { logger } from './logger';
import config from '../config';

const ADMIN_EMAIL = 'admin@pixora.dev';
const ADMIN_PASSWORD = 'PixoraDemo123!';

const MANAGER_EMAIL = 'manager@democafe.com';
const STAFF1_EMAIL = 'staff1@democafe.com';
const STAFF2_EMAIL = 'staff2@democafe.com';
const DEMO_PASSWORD = 'PixoraDemo123!';
const DEFAULT_PIN = '1234';

export const seedDatabase = async () => {
  const mongoURI = config.db.mongoUri;

  try {
    logger.info('Connecting to database for seeding...');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    // ------------------------------------------------------------------------
    // 1. Seed Subscription Plans with All 17 Core Feature Flags
    // ------------------------------------------------------------------------
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
        description: 'QR Menu, Waiter Call, and Basic Dine-In & Takeaway Ordering.',
        includedFeatureKeys: ['qr_menu', 'ordering', 'waiter_call', 'takeaway'],
      },
      {
        key: 'PROFESSIONAL',
        name: 'Professional Plan',
        description: 'Full Dine-In & Takeaway ordering, Payments, Customer Display, and Analytics.',
        includedFeatureKeys: [
          'qr_menu',
          'ordering',
          'waiter_call',
          'payments',
          'analytics',
          'inventory',
          'takeaway',
          'customer_display',
          'coupons',
        ],
      },
      {
        key: 'ENTERPRISE',
        name: 'Enterprise Plan',
        description: 'All features including KDS, White Labeling, POS Integrations, CRM, and Developer APIs.',
        includedFeatureKeys: [
          'qr_menu',
          'ordering',
          'waiter_call',
          'payments',
          'kds',
          'inventory',
          'analytics',
          'customer_display',
          'delivery',
          'takeaway',
          'pos',
          'pos_integration',
          'coupons',
          'loyalty',
          'crm',
          'api_webhooks',
          'api_access',
          'white_label',
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

    // ------------------------------------------------------------------------
    // 2. Seed SUPER_ADMIN idempotently
    // ------------------------------------------------------------------------
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
        pin: DEFAULT_PIN,
      });
      await superAdmin.save();
      logger.info('SUPER_ADMIN created successfully.');
    } else {
      superAdmin.pin = DEFAULT_PIN;
      await superAdmin.save();
      logger.info(`SUPER_ADMIN already exists: ${superAdmin.email}.`);
    }

    // Initialize Sequence Counter if not exists
    let counter = await Counter.findOne({ name: 'restaurant_code' });
    if (!counter) {
      counter = new Counter({ name: 'restaurant_code', seq: 1 });
      await counter.save();
    }

    // ------------------------------------------------------------------------
    // 3. Seed "Demo Cafe" Restaurant idempotently
    // ------------------------------------------------------------------------
    logger.info('Checking for existing "Demo Cafe" restaurant...');
    let restaurant = await Restaurant.findOne({ slug: 'demo-cafe' });
    if (!restaurant) {
      restaurant = new Restaurant({
        code: 'RST-000001',
        name: 'Demo Cafe',
        slug: 'demo-cafe',
        status: 'ACTIVE',
        description: 'A charming, high-performance coffee and artisan dining spot.',
        phone: '+91 9999999999',
        email: 'info@democafe.com',
        address: '123 Espresso Boulevard, Indiranagar, Bangalore, Karnataka 560038',
        logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80',
        coverImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80',
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

    // Seed/Update RestaurantSettings
    let settings = await RestaurantSettings.findOne({ restaurantId: restaurant._id });
    const settingsPayload = {
      restaurantId: restaurant._id,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      paymentConfig: {
        activeProvider: 'CASH',
        activeMode: 'POSTPAID',
        taxRatePercent: 5.0,
        paymentMethods: { cash: true, card: true, upi: true, razorpay: true },
        razorpayConfig: { keyId: 'rzp_test_demoKey123', keySecret: 'demoSecret456' },
        integrationConfig: { provider: 'PETPOOJA', config: { outletId: 'democafe_01', enabled: true } },
        gstNumber: '29ABCDE1234F1Z5',
      },
      workflow: {
        orderWorkflowMode: 'FIVE_STEP',
        autoAcceptConfig: { enabled: false, delaySeconds: 10 },
      },
      orderConfig: {
        minOrderAmount: 0,
        allowSpecialInstructions: true,
        enableTableOrdering: true,
        enableTakeaway: true,
        enableDelivery: false,
      },
      inventoryConfig: {
        enableLowStockAlerts: true,
        defaultLowStockThreshold: 5,
        auto86OnZeroStock: true,
      },
      uiSettings: {
        defaultLanguage: 'en',
        displayItemImages: true,
        enableDarkMode: false,
      },
      notificationPreferences: {
        emailNotifications: true,
        smsNotifications: false,
        whatsappNotifications: true,
      },
      timings: { open: '08:00', close: '23:00' },
      branding: {
        logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&auto=format&fit=crop&q=80',
        coverImageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&auto=format&fit=crop&q=80',
        googleReviewUrl: 'https://g.page/r/democafe-reviews',
        whatsapp: '+919999999999',
        socialLinks: { facebook: 'https://fb.com/democafe', instagram: 'https://instagr.am/democafe', twitter: 'https://x.com/democafe' },
      },
      theme: { primaryColor: '#111827', secondaryColor: '#FFFFFF', accentColor: '#F59E0B', fontFamily: 'Plus Jakarta Sans' },
    };

    if (!settings) {
      settings = new RestaurantSettings(settingsPayload);
      await settings.save();
    } else {
      Object.assign(settings, settingsPayload);
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

    // ------------------------------------------------------------------------
    // 4. Seed Manager & Staff Users with PIN
    // ------------------------------------------------------------------------
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
        pin: DEFAULT_PIN,
      });
      await manager.save();
      logger.info(`Manager account created: ${MANAGER_EMAIL}`);
    } else {
      manager.pin = DEFAULT_PIN;
      await manager.save();
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
        pin: DEFAULT_PIN,
      });
      await staff1.save();
      logger.info(`Staff 1 account created: ${STAFF1_EMAIL}`);
    } else {
      staff1.pin = DEFAULT_PIN;
      await staff1.save();
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
        pin: DEFAULT_PIN,
      });
      await staff2.save();
      logger.info(`Staff 2 account created: ${STAFF2_EMAIL}`);
    } else {
      staff2.pin = DEFAULT_PIN;
      await staff2.save();
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

    // ------------------------------------------------------------------------
    // 5. Seed Taxes & Table Zones
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // 6. Seed Tables idempotently per zone
    // ------------------------------------------------------------------------
    logger.info('Seeding tables...');
    try {
      await Table.collection.dropIndex('restaurantId_1_tableNumber_1');
    } catch {
      // Ignore if legacy index does not exist
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
          status: 'AVAILABLE',
          isArchived: false,
          isActive: true,
        });
        logger.info(`Table ${t.num} in zone seeded.`);
      } else {
        existingTable.displayName = t.name;
        await existingTable.save();
      }
      seededTables.push(existingTable);
    }

    // ------------------------------------------------------------------------
    // 7. Seed 5 Categories & 20 Menu Items with Photography & Inventory
    // ------------------------------------------------------------------------
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

    logger.info('Seeding menu items with rich imagery and inventory stock...');
    const itemsData = [
      // 1. Coffee
      {
        cat: 'Coffee Specialties',
        name: 'Madras Filter Coffee',
        price: 12000,
        veg: true,
        spicy: false,
        prep: 4,
        trackStock: true,
        stock: 50,
        lowStock: 10,
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Froth', priceDelta: 1500 }, { name: 'Jaggery Sweetener', priceDelta: 2000 }],
      },
      {
        cat: 'Coffee Specialties',
        name: 'Nutella Mocha Latte',
        price: 21000,
        veg: true,
        spicy: false,
        prep: 5,
        trackStock: true,
        stock: 25,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Oat Milk Substitute', priceDelta: 4000 }, { name: 'Whipped Cream', priceDelta: 2500 }],
      },
      {
        cat: 'Coffee Specialties',
        name: 'Single Origin Espresso',
        price: 15000,
        veg: true,
        spicy: false,
        prep: 3,
        trackStock: false,
        stock: 0,
        lowStock: 0,
        imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Shot', priceDelta: 5000 }],
      },
      {
        cat: 'Coffee Specialties',
        name: 'Cold Brew on Draft',
        price: 18000,
        veg: true,
        spicy: false,
        prep: 3,
        trackStock: true,
        stock: 4,
        lowStock: 5, // Low stock trigger
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Vanilla Sweet Cream', priceDelta: 3000 }],
      },
      // 2. Pizzas
      {
        cat: 'House Baked Pizzas',
        name: 'Classic Margherita Sourdough',
        price: 44900,
        veg: true,
        spicy: false,
        prep: 12,
        trackStock: true,
        stock: 30,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Fresh Burrata Ball', priceDelta: 12000 }, { name: 'Extra Basil Pesto', priceDelta: 3500 }],
      },
      {
        cat: 'House Baked Pizzas',
        name: 'Spicy Paneer Tikka Furnace Pizza',
        price: 54900,
        veg: true,
        spicy: true,
        prep: 15,
        trackStock: true,
        stock: 18,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Paneer Cubes', priceDelta: 6000 }, { name: 'Jalapeno Slices', priceDelta: 2500 }],
      },
      {
        cat: 'House Baked Pizzas',
        name: 'Garden Pesto & Mushroom Pizza',
        price: 49900,
        veg: true,
        spicy: false,
        prep: 14,
        trackStock: false,
        stock: 0,
        lowStock: 0,
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Truffle Oil Drizzle', priceDelta: 8000 }],
      },
      {
        cat: 'House Baked Pizzas',
        name: 'Hot Chili Pepper Double Cheese Pizza',
        price: 52900,
        veg: true,
        spicy: true,
        prep: 13,
        trackStock: true,
        stock: 20,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Double Mozzarella', priceDelta: 7000 }, { name: 'Chili Flakes Jar', priceDelta: 1500 }],
      },
      // 3. Sliders
      {
        cat: 'Gourmet Sliders',
        name: 'Crispy Veg Patty Brioche Slider',
        price: 29900,
        veg: true,
        spicy: false,
        prep: 10,
        trackStock: true,
        stock: 40,
        lowStock: 8,
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Cheddar Cheese Slice', priceDelta: 3000 }, { name: 'Caramelized Onions', priceDelta: 2000 }],
      },
      {
        cat: 'Gourmet Sliders',
        name: 'Spiced Potato Masala Slider',
        price: 19900,
        veg: true,
        spicy: true,
        prep: 8,
        trackStock: true,
        stock: 35,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Mint Chutney Dip', priceDelta: 1500 }],
      },
      {
        cat: 'Gourmet Sliders',
        name: 'Paneer Firecracker Melt Slider',
        price: 32900,
        veg: true,
        spicy: true,
        prep: 11,
        trackStock: true,
        stock: 15,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Peri Peri Fries Addon', priceDelta: 5500 }],
      },
      {
        cat: 'Gourmet Sliders',
        name: 'Portobello Truffle Cheese Slider',
        price: 34900,
        veg: true,
        spicy: false,
        prep: 12,
        trackStock: false,
        stock: 0,
        lowStock: 0,
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Smoked Gouda Slice', priceDelta: 4500 }],
      },
      // 4. Desserts
      {
        cat: 'Artisanal Desserts',
        name: 'Woodfired Hot Fudge Skillet Cookie',
        price: 26000,
        veg: true,
        spicy: false,
        prep: 10,
        trackStock: true,
        stock: 12,
        lowStock: 3,
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Vanilla Bean Gelato Scoop', priceDelta: 4500 }, { name: 'Toasted Hazelnuts', priceDelta: 3000 }],
      },
      {
        cat: 'Artisanal Desserts',
        name: 'Saffron Pistachio Tres Leches',
        price: 32000,
        veg: true,
        spicy: false,
        prep: 6,
        trackStock: true,
        stock: 8,
        lowStock: 3,
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Saffron Milk Soak', priceDelta: 3500 }],
      },
      {
        cat: 'Artisanal Desserts',
        name: 'Classic Tiramisu on Espresso Soak',
        price: 29000,
        veg: true,
        spicy: false,
        prep: 5,
        trackStock: false,
        stock: 0,
        lowStock: 0,
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Cocoa Powder Dusting', priceDelta: 1000 }],
      },
      {
        cat: 'Artisanal Desserts',
        name: 'Salted Caramel Pecan Tart',
        price: 28000,
        veg: true,
        spicy: false,
        prep: 5,
        trackStock: true,
        stock: 10,
        lowStock: 3,
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Sea Salt Flakes', priceDelta: 1000 }],
      },
      // 5. Tonics
      {
        cat: 'Refreshing Tonics',
        name: 'Cold Pressed Orange Zest Mojito',
        price: 16000,
        veg: true,
        spicy: false,
        prep: 4,
        trackStock: true,
        stock: 45,
        lowStock: 10,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Chia Seeds Boost', priceDelta: 2000 }],
      },
      {
        cat: 'Refreshing Tonics',
        name: 'Ginger Lemongrass Herbal Fizz',
        price: 14000,
        veg: true,
        spicy: false,
        prep: 4,
        trackStock: true,
        stock: 30,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Honey Infusion', priceDelta: 2000 }],
      },
      {
        cat: 'Refreshing Tonics',
        name: 'Wild Berries Iced Hibiscus Tea',
        price: 15000,
        veg: true,
        spicy: false,
        prep: 3,
        trackStock: false,
        stock: 0,
        lowStock: 0,
        imageUrl: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Fresh Mint Sprig', priceDelta: 1000 }],
      },
      {
        cat: 'Refreshing Tonics',
        name: 'Cucumber Cooler Basil Tonic',
        price: 13000,
        veg: true,
        spicy: false,
        prep: 4,
        trackStock: true,
        stock: 22,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Crushed Ice Extra', priceDelta: 500 }],
      },
    ];

    const seededMenuItems: any[] = [];
    for (const [idx, item] of itemsData.entries()) {
      const catId = categoryMap[item.cat];
      if (!catId) continue;

      let menuItem = await MenuItem.findOne({
        restaurantId: restaurant._id,
        name: item.name,
      });

      const menuItemPayload = {
        restaurantId: restaurant._id,
        categoryId: catId,
        name: item.name,
        description: `Signature house specialty ${item.name.toLowerCase()} prepared fresh with artisan ingredients.`,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: true,
        isVegetarian: item.veg,
        isSpicy: item.spicy,
        prepTimeMinutes: item.prep,
        trackStock: item.trackStock,
        stockQuantity: item.stock,
        lowStockThreshold: item.lowStock,
        sortOrder: idx,
        addOns: item.addOns || [],
        externalIds: { petpoojaItemId: `PP_ITEM_${idx + 1}` },
        isArchived: false,
      };

      if (!menuItem) {
        menuItem = await MenuItem.create(menuItemPayload);
        logger.info(`Menu Item "${item.name}" seeded.`);
      } else {
        Object.assign(menuItem, menuItemPayload);
        await menuItem.save();
      }
      seededMenuItems.push(menuItem);
    }

    // ------------------------------------------------------------------------
    // 8. Seed Sample Active & Completed Orders with Live Statuses
    // ------------------------------------------------------------------------
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
        paymentProvider: 'RAZORPAY',
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
        paymentProvider: 'RAZORPAY',
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
        paymentProvider: 'CASH',
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
        paymentProvider: 'CASH',
        item: seededMenuItems[12],
        qty: 2,
      },
    ];

    const seededOrders: any[] = [];
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
          openedAt: new Date(Date.now() - 30 * 60 * 1000),
          closedAt: ord.status === 'SERVED' ? new Date() : undefined,
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
              specialInstructions: 'Prepare fresh with extra napkins',
              prepTimeMinutesSnapshot: ord.item.prepTimeMinutes,
              itemStatus:
                ord.status === 'SERVED'
                  ? 'SERVED'
                  : ord.status === 'READY'
                  ? 'READY'
                  : ord.status === 'PREPARING'
                  ? 'PREPARING'
                  : 'PENDING',
              servedAt: ord.status === 'SERVED' ? new Date() : undefined,
            },
          ],
          integrationMetadata: {
            petpoojaOrderId: `PP_ORD_${ord.orderNumber}`,
            syncedAt: new Date(),
          },
        });
        logger.info(`Sample order ORD-${ord.orderNumber} seeded.`);
      }

      if (existingOrder) {
        seededOrders.push({ order: existingOrder, meta: ord });
      }
    }

    // ------------------------------------------------------------------------
    // 9. Seed Financial Transactions for Paid Orders
    // ------------------------------------------------------------------------
    logger.info('Seeding financial transactions...');
    for (const { order, meta } of seededOrders) {
      const existingTx = await Transaction.findOne({ restaurantId: restaurant._id, orderId: order._id });
      if (!existingTx) {
        await Transaction.create({
          restaurantId: restaurant._id,
          tableSessionId: order.sessionId,
          orderId: order._id,
          provider: meta.paymentProvider || 'CASH',
          mode: 'POSTPAID',
          amount: order.total,
          currency: 'INR',
          status: 'CAPTURED',
          providerReferenceId: `tx_ref_${order.orderNumber}_${Date.now()}`,
          metadata: { orderNumber: order.orderNumber, seeded: true },
        });
        logger.info(`Transaction for order ORD-${order.orderNumber} seeded.`);
      }
    }

    // ------------------------------------------------------------------------
    // 10. Seed Inventory Logs for Inventory Tracking Auditing
    // ------------------------------------------------------------------------
    logger.info('Seeding sample inventory stock adjustment logs...');
    const existingInvLogs = await InventoryLog.countDocuments({ restaurantId: restaurant._id });
    if (existingInvLogs === 0 && seededMenuItems.length > 0) {
      await InventoryLog.create([
        {
          restaurantId: restaurant._id,
          menuItemId: seededMenuItems[0]._id,
          actorType: 'MANAGER',
          actorId: manager._id,
          action: 'STOCK_ADJUSTMENT',
          previousQuantity: 20,
          newQuantity: 50,
          previousAvailability: true,
          newAvailability: true,
          reason: 'Initial morning stock receipt from roastery supplier.',
        },
        {
          restaurantId: restaurant._id,
          menuItemId: seededMenuItems[3]._id, // Low stock Cold Brew
          actorType: 'ORDER',
          action: 'ORDER_DECREMENT',
          previousQuantity: 6,
          newQuantity: 4,
          previousAvailability: true,
          newAvailability: true,
          orderId: seededOrders[0]?.order?._id,
          reason: 'Deducted by customer order ORD-101.',
        },
        {
          restaurantId: restaurant._id,
          menuItemId: seededMenuItems[4]._id,
          actorType: 'MANAGER',
          actorId: manager._id,
          action: 'STOCK_ADJUSTMENT',
          previousQuantity: 10,
          newQuantity: 30,
          previousAvailability: true,
          newAvailability: true,
          reason: 'Fresh batch of sourdough dough balls prepared.',
        },
      ]);
      logger.info('Sample Inventory Logs seeded.');
    }

    // ------------------------------------------------------------------------
    // 11. Seed Administrative & Operational Audit Logs
    // ------------------------------------------------------------------------
    logger.info('Seeding administrative audit logs...');
    const existingAuditLogs = await AuditLog.countDocuments({ restaurantId: restaurant._id.toString() });
    if (existingAuditLogs === 0) {
      await AuditLog.create([
        {
          action: 'RESTAURANT_PROVISIONED',
          actorId: superAdmin._id.toString(),
          actorName: superAdmin.name,
          actorRole: 'SUPER_ADMIN',
          restaurantId: restaurant._id.toString(),
          restaurantName: restaurant.name,
          details: { plan: 'ENTERPRISE', tablesCount: 5 },
          severity: 'INFO',
        },
        {
          action: 'MENU_CATALOG_SYNCED',
          actorId: manager._id.toString(),
          actorName: manager.name,
          actorRole: 'MANAGER',
          restaurantId: restaurant._id.toString(),
          restaurantName: restaurant.name,
          details: { categoriesCount: 5, itemsCount: 20 },
          severity: 'INFO',
        },
        {
          action: 'FEATURE_FLAGS_UPDATED',
          actorId: superAdmin._id.toString(),
          actorName: superAdmin.name,
          actorRole: 'SUPER_ADMIN',
          restaurantId: restaurant._id.toString(),
          restaurantName: restaurant.name,
          details: { planKey: 'ENTERPRISE', flagsCount: 17 },
          severity: 'INFO',
        },
      ]);
      logger.info('Administrative Audit Logs seeded.');
    }

    // ------------------------------------------------------------------------
    // 12. Seed Waiter Calls for Notification Testing
    // ------------------------------------------------------------------------
    logger.info('Seeding sample waiter calls...');
    if (seededTables[0]) {
      const existingCall = await WaiterCall.findOne({
        restaurantId: restaurant._id,
        tableId: seededTables[0]._id,
        status: 'PENDING',
      });
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

    // ------------------------------------------------------------------------
    // 13. Seed Integration Sync Logs for Petpooja POS
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // 14. Seed API Keys & Webhook Subscriptions for Developer Portal
    // ------------------------------------------------------------------------
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

    // ------------------------------------------------------------------------
    // 15. Assign ENTERPRISE Plan & Sync All 17 Feature Flags via Service
    // ------------------------------------------------------------------------
    logger.info('Assigning ENTERPRISE Plan and syncing all Feature Flags...');
    await subscriptionService.assignPlanToRestaurant(restaurant._id, 'ENTERPRISE');
    logger.info('ENTERPRISE Plan assigned and all Feature Flags synced.');

    // ------------------------------------------------------------------------
    // 16. Recalculate Live Restaurant Stats for 100% Data Accuracy
    // ------------------------------------------------------------------------
    logger.info('Recalculating live RestaurantStats from database...');
    const updatedStats = await restaurantStatsService.recalculateStats(restaurant._id);
    logger.info(
      `RestaurantStats Synced: ${updatedStats?.menuItemsCount} items, ${updatedStats?.tablesCount} tables, ${updatedStats?.staffCount} staff, ${updatedStats?.ordersCount} orders, ₹${((updatedStats?.revenue || 0) / 100).toFixed(2)} total revenue.`
    );

    logger.info('================================================================');
    logger.info('IDEMPOTENT DATABASE SEED COMPLETED SUCCESSFULLY!');
    logger.info(`SUPER ADMIN Email: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (PIN: ${DEFAULT_PIN})`);
    logger.info(`DEMO RESTAURANT SLUG: demo-cafe (Code: ${restaurant.code})`);
    logger.info(`DEMO MANAGER Email: ${MANAGER_EMAIL} / ${DEMO_PASSWORD} (PIN: ${DEFAULT_PIN})`);
    logger.info(`DEMO STAFF 1 Email: ${STAFF1_EMAIL} / ${DEMO_PASSWORD} (PIN: ${DEFAULT_PIN})`);
    logger.info(`DEMO STAFF 2 Email: ${STAFF2_EMAIL} / ${DEMO_PASSWORD} (PIN: ${DEFAULT_PIN})`);
    logger.info('================================================================');
  } catch (error) {
    logger.error(error, 'Error seeding database');
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('Disconnected from database.');
    }
  }
};

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedDatabase;
