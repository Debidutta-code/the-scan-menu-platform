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
import { CustomizationGroup } from '../models/CustomizationGroup';
import { Table } from '../models/Table';
import { TableZone } from '../models/TableZone';
import { Tax } from '../models/Tax';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Customer } from '../models/Customer';
import { LoyaltyLedger } from '../models/LoyaltyLedger';
import { Shift } from '../models/Shift';
import { Order, OrderCounter } from '../models/Order';
import { DiningSession } from '../models/DiningSession';
import { GuestSession } from '../models/GuestSession';
import { Bill } from '../models/Bill';
import { Payment } from '../models/Payment';
import { WaiterCall } from '../models/WaiterCall';
import { IntegrationSyncLog } from '../models/IntegrationSyncLog';
import { ApiKey } from '../models/ApiKey';
import { WebhookSubscription } from '../models/WebhookSubscription';
import { InventoryLog } from '../models/InventoryLog';
import { Transaction } from '../models/Transaction';
import { AuditLog } from '../models/AuditLog';
import { PlatformSettings } from '../models/PlatformSettings';
import { subscriptionService } from '../services/subscription.service';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { getTodayDateKey } from './orderCounter';
import { cacheService } from './cacheService';
import { logger } from './logger';
import config from '../config';

const ADMIN_EMAIL = 'superadmin@gmail.com';
const ADMIN_PASSWORD = 'Test@1234';

const MANAGER_EMAIL = 'manager@democafe.com';
const STAFF1_EMAIL = 'staff1@democafe.com';
const STAFF2_EMAIL = 'staff2@democafe.com';
const DEMO_PASSWORD = 'Test@1234';
const DEFAULT_PIN = '1234';

export const seedDatabase = async () => {
  const mongoURI = config.db.mongoUri;

  try {
    logger.info('Connecting to database for seeding...');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    // ------------------------------------------------------------------------
    // 1. Seed Subscription Plans with All 19 Core Feature Flags
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
        description: 'Full Dine-In & Takeaway ordering, Customer OTP, Payments, Customer Display, Mobile App, and Analytics.',
        includedFeatureKeys: [
          'qr_menu',
          'ordering',
          'customer_otp',
          'waiter_call',
          'mobile_app',
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
        description: 'All features including Customer OTP, Mobile App, KDS, White Labeling, POS Integrations, CRM, and Developer APIs.',
        includedFeatureKeys: [
          'qr_menu',
          'ordering',
          'customer_otp',
          'waiter_call',
          'mobile_app',
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
      superAdmin.passwordHash = hashedPassword;
      superAdmin.pin = DEFAULT_PIN;
      await superAdmin.save();
      logger.info(`SUPER_ADMIN password refreshed: ${superAdmin.email}.`);
    }

    // Initialize Sequence Counter if not exists
    let counter = await Counter.findOne({ name: 'restaurant_code' });
    if (!counter) {
      counter = new Counter({ name: 'restaurant_code', seq: 1 });
      await counter.save();
    }

    // Initialize Platform Settings if not exists
    let platformSettings = await PlatformSettings.findOne();
    if (!platformSettings) {
      platformSettings = new PlatformSettings({
        loyalty: {
          mode: 'GLOBAL',
          enabled: true,
          earningMode: 'PERCENTAGE',
          earnPercentage: 50,
          spendRatioPaise: 1000,
          fixedPointsPerOrder: 50,
          validityDays: 7,
          pointValuePaise: 50,
          maxRedemptionPercentPerOrder: 50,
          minPointsToRedeem: 50,
        },
      });
      await platformSettings.save();
      logger.info('Global PlatformSettings initialized.');
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

    // Assign Enterprise subscription and sync all feature flags
    await subscriptionService.assignPlanToRestaurant(restaurant._id, 'ENTERPRISE');
    logger.info('"Demo Cafe" feature flags strictly synced with Enterprise plan.');

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
        upiId: 'democafe@okhdfcbank',
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
        customerOtpEnabled: false,
      },
      roundingConfig: {
        enabled: false,
        strategy: 'NEAREST',
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
      printerConfig: {
        paperWidth: '80mm',
        templateTheme: 'classic',
        showLogo: true,
        showGstNumber: true,
        showFssai: true,
        fssaiNumber: '12345678901234',
        receiptHeader: 'Welcome to Demo Cafe!',
        receiptFooter: 'Thank you for dining with us! Visit again.',
        showCustomerInfo: true,
        showPaymentMode: true,
        showTaxBreakup: true,
        showPaymentQr: true,
        upiId: 'democafe@okhdfcbank',
        defaultPrintTarget: 'BOTH',
        silentPrintingEnabled: false,
        kitchenPrinterIp: '192.168.1.105',
        kitchenPrinterPort: 9100,
        counterPrinterIp: '192.168.1.100',
        counterPrinterPort: 9100,
      },
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
      manager.passwordHash = demoHashedPassword;
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
      staff1.passwordHash = demoHashedPassword;
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
      staff2.passwordHash = demoHashedPassword;
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
    // 7. Seed Reusable Customization Templates (Add-on Groups)
    // ------------------------------------------------------------------------
    logger.info('Seeding Reusable Customization Templates...');
    const customGroupsData = [
      {
        name: 'Choice of Crust',
        type: 'VARIANT' as const,
        description: 'Select your pizza crust base',
        selectionType: 'SINGLE' as const,
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        isGlobal: true,
        options: [
          { name: 'Classic Hand Tossed', priceDelta: 0 },
          { name: 'Cheese Burst Crust', priceDelta: 8000 },
          { name: 'Thin & Crispy Wheat', priceDelta: 3000 },
        ],
      },
      {
        name: 'Extra Dips & Sauces',
        type: 'ADDON' as const,
        description: 'House-crafted dips and chutneys',
        selectionType: 'MULTIPLE' as const,
        minSelections: 0,
        maxSelections: 3,
        isRequired: false,
        isGlobal: true,
        options: [
          { name: 'Garlic Aioli Mayo', priceDelta: 2500 },
          { name: 'Fiery Peri-Peri Dip', priceDelta: 3000 },
          { name: 'Fresh Mint Chutney', priceDelta: 1500 },
        ],
      },
      {
        name: 'Cheese & Gourmet Toppings',
        type: 'ADDON' as const,
        description: 'Premium artisanal cheese and toppings',
        selectionType: 'MULTIPLE' as const,
        minSelections: 0,
        maxSelections: 5,
        isRequired: false,
        isGlobal: true,
        options: [
          { name: 'Extra Mozzarella Melt', priceDelta: 6000 },
          { name: 'Smoked Cheddar Slice', priceDelta: 3500 },
          { name: 'Pickled Jalapenos', priceDelta: 2500 },
        ],
      },
      {
        name: 'Coffee & Beverage Additions',
        type: 'ADDON' as const,
        description: 'Milk substitutes and espresso shots',
        selectionType: 'MULTIPLE' as const,
        minSelections: 0,
        maxSelections: 3,
        isRequired: false,
        isGlobal: true,
        options: [
          { name: 'Oat Milk Substitute', priceDelta: 4000 },
          { name: 'Extra Double Espresso Shot', priceDelta: 5000 },
          { name: 'Vanilla Caramel Drizzle', priceDelta: 3000 },
        ],
      },
    ];

    const seededGroups: any[] = [];
    for (const grp of customGroupsData) {
      let existingGrp = await CustomizationGroup.findOne({
        restaurantId: restaurant._id,
        name: grp.name,
      });
      if (!existingGrp) {
        existingGrp = await CustomizationGroup.create({
          restaurantId: restaurant._id,
          ...grp,
        });
        logger.info(`Customization Template "${grp.name}" created.`);
      } else {
        Object.assign(existingGrp, grp);
        await existingGrp.save();
      }
      seededGroups.push(existingGrp);
    }

    // ------------------------------------------------------------------------
    // 7b. Seed Categories
    // ------------------------------------------------------------------------
    logger.info('Seeding categories...');
    const catsData = [
      { name: 'Coffee Specialties', order: 0 },
      { name: 'House Baked Pizzas', order: 1 },
      { name: 'Gourmet Sliders', order: 2 },
      { name: 'North Indian Curries & Breads', order: 3 },
      { name: 'Artisanal Desserts', order: 4 },
      { name: 'Refreshing Tonics', order: 5 },
      { name: 'Chef Combos & Value Packs', order: 6 },
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

    // ------------------------------------------------------------------------
    // 7c. Seed Rich Menu Items (Single, Portion Variants, Combos, Veg/NonVeg)
    // ------------------------------------------------------------------------
    logger.info('Seeding menu items with portion pricing, combos, imagery, and stock...');
    const itemsData = [
      // 1. Coffee Specialties
      {
        cat: 'Coffee Specialties',
        name: 'Madras Filter Coffee',
        pricingType: 'SINGLE' as const,
        price: 12000,
        originalPrice: 15000,
        isTopPick: true,
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
        pricingType: 'SINGLE' as const,
        price: 21000,
        originalPrice: 24000,
        isTopPick: false,
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
        pricingType: 'SINGLE' as const,
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
        name: 'Artisan Cold Brew on Draft',
        pricingType: 'PORTION' as const,
        price: 16000,
        originalPrice: 19000,
        isTopPick: true,
        variants: [
          { name: 'Regular 250ml', price: 16000, isDefault: true },
          { name: 'Large 400ml', price: 22000, isDefault: false },
        ],
        veg: true,
        spicy: false,
        prep: 3,
        trackStock: true,
        stock: 4,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Vanilla Sweet Cream', priceDelta: 3000 }],
      },
      {
        cat: 'Coffee Specialties',
        name: 'Single-Estate Reserve Roast Blend',
        pricingType: 'PORTION' as const,
        price: 10000,
        variants: [
          { name: 'Cup 150ml', price: 10000, isDefault: true },
          { name: 'Mug 250ml', price: 15000, isDefault: false },
          { name: 'Pot 500ml', price: 28000, isDefault: false },
          { name: 'Carafe 1L', price: 48000, isDefault: false },
        ],
        veg: true,
        spicy: false,
        prep: 4,
        trackStock: true,
        stock: 20,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Warm Milk on Side', priceDelta: 2000 }],
      },

      // 2. House Baked Pizzas
      {
        cat: 'House Baked Pizzas',
        name: 'Classic Margherita Sourdough',
        pricingType: 'PORTION' as const,
        price: 34900,
        originalPrice: 39900,
        isTopPick: true,
        variants: [
          { name: '8" Personal', price: 34900, isDefault: true },
          { name: '10" Medium', price: 49900, isDefault: false },
          { name: '12" Large', price: 64900, isDefault: false },
        ],
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
        pricingType: 'SINGLE' as const,
        price: 54900,
        originalPrice: 59900,
        isTopPick: false,
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
        name: 'Smoked Pepperoni & Meat Pizza',
        pricingType: 'PORTION' as const,
        price: 59900,
        originalPrice: 69900,
        isTopPick: true,
        variants: [
          { name: 'Regular 10"', price: 59900, isDefault: true },
          { name: 'Large 14"', price: 79900, isDefault: false },
        ],
        veg: false, // Non-Veg Red Triangle
        spicy: true,
        prep: 14,
        trackStock: true,
        stock: 22,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Double Mozzarella', priceDelta: 7000 }, { name: 'Chili Flakes Jar', priceDelta: 1500 }],
      },

      // 3. Gourmet Sliders
      {
        cat: 'Gourmet Sliders',
        name: 'Crispy Veg Patty Brioche Slider',
        pricingType: 'SINGLE' as const,
        price: 29900,
        originalPrice: 34900,
        isTopPick: false,
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
        name: 'Grilled Chicken & Bacon Brioche Slider',
        pricingType: 'SINGLE' as const,
        price: 37900,
        originalPrice: 42900,
        isTopPick: true,
        veg: false, // Non-Veg
        spicy: true,
        prep: 11,
        trackStock: true,
        stock: 25,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Peri Peri Fries Addon', priceDelta: 5500 }],
      },
      {
        cat: 'Gourmet Sliders',
        name: 'Paneer Firecracker Melt Slider',
        pricingType: 'SINGLE' as const,
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

      // 4. North Indian Curries & Breads
      {
        cat: 'North Indian Curries & Breads',
        name: 'Paneer Butter Masala',
        pricingType: 'PORTION' as const,
        price: 18000,
        originalPrice: 22000,
        isTopPick: true,
        variants: [
          { name: 'Half', price: 18000, isDefault: true },
          { name: 'Full', price: 32000, isDefault: false },
        ],
        veg: true,
        spicy: true,
        prep: 12,
        trackStock: true,
        stock: 30,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Butter Cube', priceDelta: 2000 }, { name: 'Fried Garlic Topping', priceDelta: 1500 }],
      },
      {
        cat: 'North Indian Curries & Breads',
        name: 'Smoked Butter Chicken',
        pricingType: 'PORTION' as const,
        price: 24000,
        originalPrice: 28000,
        isTopPick: true,
        variants: [
          { name: 'Half', price: 24000, isDefault: true },
          { name: 'Full', price: 42000, isDefault: false },
        ],
        veg: false, // Non-Veg
        spicy: true,
        prep: 14,
        trackStock: true,
        stock: 25,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Gravy Bowl', priceDelta: 5000 }],
      },
      {
        cat: 'North Indian Curries & Breads',
        name: 'Butter Garlic Naan',
        pricingType: 'SINGLE' as const,
        price: 7000,
        originalPrice: 8500,
        veg: true,
        spicy: false,
        prep: 5,
        trackStock: true,
        stock: 60,
        lowStock: 15,
        imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Butter Brush', priceDelta: 1000 }],
      },

      // 5. Artisanal Desserts
      {
        cat: 'Artisanal Desserts',
        name: 'Woodfired Hot Fudge Skillet Cookie',
        pricingType: 'SINGLE' as const,
        price: 26000,
        originalPrice: 29900,
        isTopPick: true,
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
        pricingType: 'SINGLE' as const,
        price: 32000,
        originalPrice: 36000,
        isTopPick: false,
        veg: true,
        spicy: false,
        prep: 6,
        trackStock: true,
        stock: 8,
        lowStock: 3,
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Saffron Milk Soak', priceDelta: 3500 }],
      },

      // 6. Refreshing Tonics
      {
        cat: 'Refreshing Tonics',
        name: 'Cold Pressed Orange Zest Mojito',
        pricingType: 'SINGLE' as const,
        price: 16000,
        originalPrice: 19000,
        isTopPick: true,
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
        name: 'Wild Berries Iced Hibiscus Tea',
        pricingType: 'SINGLE' as const,
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

      // 7. Chef Combos & Value Packs
      {
        cat: 'Chef Combos & Value Packs',
        name: 'North Indian Deluxe Feast Combo',
        pricingType: 'SINGLE' as const,
        price: 49900,
        originalPrice: 63000,
        isCombo: true,
        isTopPick: true,
        comboItems: [
          { name: 'Butter Garlic Naan', quantity: 2, categoryName: 'North Indian Curries & Breads', priceSnapshot: 7000 },
          { name: 'Paneer Butter Masala', quantity: 1, categoryName: 'North Indian Curries & Breads', priceSnapshot: 18000 },
          { name: 'Saffron Pistachio Tres Leches', quantity: 1, categoryName: 'Artisanal Desserts', priceSnapshot: 32000 },
        ],
        veg: true,
        spicy: true,
        prep: 15,
        trackStock: true,
        stock: 20,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Butter Garlic Naan', priceDelta: 6000 }],
      },
      {
        cat: 'Chef Combos & Value Packs',
        name: 'Pizza & Craft Mojito Duo Pack',
        pricingType: 'SINGLE' as const,
        price: 44900,
        originalPrice: 50900,
        isCombo: true,
        isTopPick: true,
        comboItems: [
          { name: 'Classic Margherita Sourdough', quantity: 1, categoryName: 'House Baked Pizzas', priceSnapshot: 34900 },
          { name: 'Cold Pressed Orange Zest Mojito', quantity: 1, categoryName: 'Refreshing Tonics', priceSnapshot: 16000 },
        ],
        veg: true,
        spicy: false,
        prep: 14,
        trackStock: true,
        stock: 15,
        lowStock: 4,
        imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Extra Dip Assortment', priceDelta: 4000 }],
        isDraft: false,
        completedStep: 5,
        totalSteps: 5,
      },
      {
        cat: 'Chef Combos & Value Packs',
        name: 'Ultimate Burger & Cold Brew Meal',
        pricingType: 'SINGLE' as const,
        price: 46900,
        originalPrice: 53900,
        isCombo: true,
        isTopPick: true,
        comboItems: [
          { name: 'Grilled Chicken & Bacon Brioche Slider', quantity: 1, categoryName: 'Gourmet Sliders', priceSnapshot: 37900 },
          { name: 'Artisan Cold Brew on Draft', quantity: 1, categoryName: 'Coffee Specialties', priceSnapshot: 16000 },
        ],
        veg: false,
        spicy: true,
        prep: 12,
        trackStock: true,
        stock: 15,
        lowStock: 3,
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        addOns: [],
        isDraft: false,
        completedStep: 5,
        totalSteps: 5,
      },

      // 8. Sample Draft Items for Testing Wizard & Step Progression
      {
        cat: 'Gourmet Sliders',
        name: 'Smoked Barbecue Jackfruit Slider (Draft)',
        pricingType: 'SINGLE' as const,
        price: 28000,
        veg: true,
        spicy: false,
        prep: 12,
        trackStock: true,
        stock: 20,
        lowStock: 5,
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
        addOns: [{ name: 'Spicy Slaw', priceDelta: 2000 }],
        isDraft: true,
        completedStep: 3,
        totalSteps: 5,
      },
      {
        cat: 'Chef Combos & Value Packs',
        name: 'Weekend Family Fiesta Feast (Draft)',
        pricingType: 'SINGLE' as const,
        price: 89900,
        originalPrice: 119900,
        isCombo: true,
        comboItems: [
          { name: 'Classic Margherita Sourdough', quantity: 2, categoryName: 'House Baked Pizzas', priceSnapshot: 34900 },
          { name: 'Crispy Veg Patty Brioche Slider', quantity: 4, categoryName: 'Gourmet Sliders', priceSnapshot: 29900 },
          { name: 'Cold Pressed Orange Zest Mojito', quantity: 4, categoryName: 'Refreshing Tonics', priceSnapshot: 16000 },
        ],
        veg: true,
        spicy: false,
        prep: 20,
        trackStock: true,
        stock: 10,
        lowStock: 2,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
        addOns: [],
        isDraft: true,
        completedStep: 4,
        totalSteps: 5,
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
        pricingType: item.pricingType || 'SINGLE',
        price: item.price,
        originalPrice: item.originalPrice,
        variants: item.variants || [],
        isCombo: !!item.isCombo,
        comboItems: item.comboItems || [],
        imageUrl: item.imageUrl,
        isAvailable: true,
        isVegetarian: item.veg,
        isSpicy: !!item.spicy,
        isChefsSpecial: !!item.isTopPick,
        isTopPick: !!item.isTopPick,
        prepTimeMinutes: item.prep,
        trackStock: !!item.trackStock,
        stockQuantity: item.stock || 0,
        lowStockThreshold: item.lowStock || 0,
        sortOrder: idx,
        addOns: item.addOns || [],
        attachedAddOnGroupIds: seededGroups.map((g) => g._id),
        externalIds: { petpoojaItemId: `PP_ITEM_${idx + 1}` },
        isDraft: !!item.isDraft,
        completedStep: item.completedStep || (item.isDraft ? 1 : 5),
        totalSteps: item.totalSteps || 5,
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
    const todayDateKey = getTodayDateKey();
    let orderCounter = await OrderCounter.findOne({ restaurantId: restaurant._id, dateKey: todayDateKey });
    if (!orderCounter) {
      orderCounter = new OrderCounter({ restaurantId: restaurant._id, dateKey: todayDateKey, seq: 100 });
      await orderCounter.save();
    }

    // ------------------------------------------------------------------------
    // 7b. Seed Sample Customers for "Demo Cafe"
    // ------------------------------------------------------------------------
    const demoCustomersData = [
      {
        phone: '9876543210',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        isPhoneVerified: true,
        totalOrdersCount: 2,
        totalSpent: 42000,
        loyaltyPoints: 420,
        lifetimePoints: 420,
        tier: 'GOLD' as const,
        lastOrderAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        phone: '9811223344',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        isPhoneVerified: false,
        totalOrdersCount: 1,
        totalSpent: 28500,
        loyaltyPoints: 280,
        lifetimePoints: 280,
        tier: 'SILVER' as const,
        lastOrderAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        phone: '9870011223',
        name: 'Priya Patel',
        email: 'priya@example.com',
        isPhoneVerified: false,
        totalOrdersCount: 1,
        totalSpent: 16000,
        loyaltyPoints: 150,
        lifetimePoints: 150,
        tier: 'BRONZE' as const,
        lastOrderAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    ];

    const seededCustomers: any[] = [];
    for (const cData of demoCustomersData) {
      let cust = await Customer.findOne({ restaurantId: restaurant._id, phone: cData.phone });
      if (!cust) {
        cust = await Customer.create({
          restaurantId: restaurant._id,
          ...cData,
          lastSeenAt: new Date(),
        });
        logger.info(`Customer ${cust.name} (${cust.phone}) created.`);
      } else {
        Object.assign(cust, cData);
        await cust.save();
      }
      seededCustomers.push(cust);

      // Seed sample Loyalty Ledger transactions
      const existingLedger = await LoyaltyLedger.findOne({ restaurantId: restaurant._id, customerId: cust._id });
      if (!existingLedger) {
        await LoyaltyLedger.create([
          {
            restaurantId: restaurant._id,
            customerId: cust._id,
            points: 100,
            rupeeValuePaise: 5000,
            balanceAfter: 100,
            type: 'ADJUST',
            reason: 'Welcome Signup Loyalty Bonus',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            restaurantId: restaurant._id,
            customerId: cust._id,
            points: cData.loyaltyPoints - 100,
            rupeeValuePaise: (cData.loyaltyPoints - 100) * 50,
            balanceAfter: cData.loyaltyPoints,
            type: 'EARN',
            reason: 'Dine-in Order 10% Points Cashback',
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ]);
        logger.info(`Loyalty Ledger seeded for ${cust.name}.`);
      }
    }

    const findItem = (name: string) => seededMenuItems.find((i) => i.name === name) || seededMenuItems[0];

    const sampleOrdersData = [
      {
        orderNumber: 101,
        table: seededTables[0], // Table 1 (Window Side)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'Please serve fresh with extra napkins and mint chutney.',
        orderItems: [
          { item: findItem('North Indian Deluxe Feast Combo'), qty: 1, instructions: 'Make curry medium spicy, hot naan' },
          { item: findItem('Cold Pressed Orange Zest Mojito'), qty: 2, instructions: 'Less ice, fresh mint' },
        ],
      },
      {
        orderNumber: 102,
        table: seededTables[1], // Table 2 (Lounge)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'ACCEPTED',
        paymentStatus: 'PAID',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'Make crust extra crispy. Bring cookie warm after main.',
        orderItems: [
          { item: findItem('Pizza & Craft Mojito Duo Pack'), qty: 1, instructions: 'Crispy sourdough base' },
          { item: findItem('Woodfired Hot Fudge Skillet Cookie'), qty: 1, instructions: 'Serve warm with vanilla scoop on top' },
        ],
      },
      {
        orderNumber: 103,
        table: seededTables[2], // Table 3 (Bar Side)
        mode: 'COUNTER',
        source: 'POS',
        status: 'PREPARING',
        paymentStatus: 'PAID',
        paymentProvider: 'CASH',
        customer: seededCustomers[1],
        customerName: 'Rahul Sharma',
        customerPhone: '9811223344',
        customerNote: 'Quick counter breakfast. Coffee extra strong.',
        orderItems: [
          { item: findItem('Artisan Cold Brew on Draft'), qty: 2, instructions: 'With oat milk substitute' },
          { item: findItem('Artisanal French Butter Croissant'), qty: 1, instructions: 'Warm with butter brush' },
        ],
      },
      {
        orderNumber: 104,
        table: seededTables[3], // Table 1 (Terrace)
        mode: 'TAKEAWAY',
        source: 'MANUAL',
        status: 'READY',
        paymentStatus: 'PAID',
        paymentProvider: 'CASH',
        customer: seededCustomers[2],
        customerName: 'Priya Patel',
        customerPhone: '9870011223',
        customerNote: 'Pack in thermal takeaway bag with wooden cutlery.',
        orderItems: [
          { item: findItem('Ultimate Burger & Cold Brew Meal'), qty: 1, instructions: 'Slider well-done, bacon extra crispy' },
          { item: findItem('Wild Berries Iced Hibiscus Tea'), qty: 1, instructions: 'Spill-proof takeaway cup' },
        ],
      },
      {
        orderNumber: 105,
        table: seededTables[4], // Table 2 (VIP Cabin)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PREPARING',
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'VIP Table Anniversary Dinner. Bring dessert at the end.',
        orderItems: [
          { item: findItem('North Indian Deluxe Feast Combo'), qty: 2, instructions: 'Extra rich butter paneer, piping hot naan' },
          { item: findItem('Saffron Pistachio Tres Leches'), qty: 2, instructions: 'Extra saffron milk soak' },
        ],
      },
      {
        orderNumber: 106,
        table: seededTables[0], // Table 1 (Window Side)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[1],
        customerName: 'Rahul Sharma',
        customerPhone: '9811223344',
        customerNote: 'Customer requested extra chili flakes and oregano on side.',
        orderItems: [
          { item: findItem('Classic Margherita Sourdough'), qty: 1, instructions: 'Extra mozzarella melt topping' },
          { item: findItem('Cold Pressed Orange Zest Mojito'), qty: 1, instructions: 'Chia seeds boost' },
        ],
      },
      {
        orderNumber: 107,
        table: seededTables[1], // Table 2 (Lounge)
        mode: 'COUNTER',
        source: 'POS',
        status: 'READY',
        paymentStatus: 'PAID',
        paymentProvider: 'CARD',
        customer: seededCustomers[2],
        customerName: 'Priya Patel',
        customerPhone: '9870011223',
        customerNote: 'Express counter pick-up for office break.',
        orderItems: [
          { item: findItem('Woodfired Hot Fudge Skillet Cookie'), qty: 2, instructions: 'Pack with toasted hazelnuts' },
          { item: findItem('Signature Espresso Macchiato'), qty: 2, instructions: 'Double espresso shot' },
        ],
      },
      {
        orderNumber: 108,
        table: seededTables[2], // Table 3 (Bar Side)
        mode: 'TAKEAWAY',
        source: 'MANUAL',
        status: 'PREPARING',
        paymentStatus: 'PAID',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[1],
        customerName: 'Rahul Sharma',
        customerPhone: '9811223344',
        customerNote: 'Include extra peri-peri dips and napkins.',
        orderItems: [
          { item: findItem('Pizza & Craft Mojito Duo Pack'), qty: 1, instructions: 'Cut into 8 slices' },
          { item: findItem('Wild Berries Iced Hibiscus Tea'), qty: 1, instructions: 'Less sugar, cold' },
        ],
      },
      {
        orderNumber: 109,
        table: seededTables[3], // Table 1 (Terrace)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'READY',
        paymentStatus: 'PAID',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'Terrace garden table. Please serve drinks first.',
        orderItems: [
          { item: findItem('Grilled Chicken & Bacon Brioche Slider'), qty: 2, instructions: 'Extra spicy aioli mayo' },
          { item: findItem('Artisan Cold Brew on Draft'), qty: 2, instructions: 'Served over cracked ice' },
        ],
      },
      {
        orderNumber: 110,
        table: seededTables[4], // Table 2 (VIP Cabin)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'SERVED',
        paymentStatus: 'PAID',
        paymentProvider: 'CASH',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'Lunch meeting completed and settled.',
        orderItems: [
          { item: findItem('North Indian Deluxe Feast Combo'), qty: 1, instructions: 'Served warm' },
          { item: findItem('Saffron Pistachio Tres Leches'), qty: 1, instructions: 'Chilled dessert' },
        ],
      },
      {
        orderNumber: 111,
        table: seededTables[0], // Table 1 (Window Side)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[2],
        customerName: 'Priya Patel',
        customerPhone: '9870011223',
        customerNote: 'No onions or garlic in slider. Allergic to peanuts.',
        orderItems: [
          { item: findItem('Ultimate Burger & Cold Brew Meal'), qty: 1, instructions: 'Strictly no peanut oil, no onions' },
          { item: findItem('Cold Pressed Orange Zest Mojito'), qty: 1, instructions: 'Extra fresh mint' },
        ],
      },
      {
        orderNumber: 112,
        table: seededTables[1], // Table 2 (Lounge)
        mode: 'COUNTER',
        source: 'POS',
        status: 'ACCEPTED',
        paymentStatus: 'PAID',
        paymentProvider: 'CASH',
        customer: seededCustomers[1],
        customerName: 'Rahul Sharma',
        customerPhone: '9811223344',
        customerNote: 'Takeaway box for office colleagues.',
        orderItems: [
          { item: findItem('Crispy Veg Patty Brioche Slider'), qty: 2, instructions: 'Extra cheese slice' },
          { item: findItem('Wild Berries Iced Hibiscus Tea'), qty: 2, instructions: 'Sealed carry pack' },
        ],
      },
      {
        orderNumber: 113,
        table: seededTables[2], // Table 3 (Bar Side)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PREPARING',
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'Afternoon coffee and pastry relax.',
        orderItems: [
          { item: findItem('Classic Flat White'), qty: 2, instructions: 'Velvety microfoam, vanilla drizzle' },
          { item: findItem('Artisanal French Butter Croissant'), qty: 2, instructions: 'Warm and crispy' },
        ],
      },
      {
        orderNumber: 114,
        table: seededTables[3], // Table 1 (Terrace)
        mode: 'DELIVERY',
        source: 'MANUAL',
        status: 'READY',
        paymentStatus: 'PAID',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[2],
        customerName: 'Priya Patel',
        customerPhone: '9870011223',
        customerNote: 'Direct delivery: 402 Palm Heights. Ring bell twice.',
        orderItems: [
          { item: findItem('Pizza & Craft Mojito Duo Pack'), qty: 2, instructions: 'Keep pizzas flat during transit' },
          { item: findItem('Woodfired Hot Fudge Skillet Cookie'), qty: 1, instructions: 'Pack gelato separately with ice bag' },
        ],
      },
      {
        orderNumber: 115,
        table: seededTables[4], // Table 2 (VIP Cabin)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'SERVED',
        paymentStatus: 'PAID',
        paymentProvider: 'CARD',
        customer: seededCustomers[1],
        customerName: 'Rahul Sharma',
        customerPhone: '9811223344',
        customerNote: 'Table settled with corporate card.',
        orderItems: [
          { item: findItem('Classic Margherita Sourdough'), qty: 1, instructions: 'Thin crust' },
          { item: findItem('Artisan Cold Brew on Draft'), qty: 1, instructions: 'Straight black' },
        ],
      },
      {
        orderNumber: 116,
        table: seededTables[0], // Table 1 (Window Side)
        mode: 'DINE_IN',
        source: 'QR',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentProvider: 'RAZORPAY',
        customer: seededCustomers[0],
        customerName: 'Alice Johnson',
        customerPhone: '9876543210',
        customerNote: 'Family celebration meal. Please bring high chair for toddler.',
        orderItems: [
          { item: findItem('North Indian Deluxe Feast Combo'), qty: 1, instructions: 'Extra butter on naan' },
          { item: findItem('Pizza & Craft Mojito Duo Pack'), qty: 1, instructions: 'Kids love margherita pizza' },
          { item: findItem('Saffron Pistachio Tres Leches'), qty: 1, instructions: 'With celebration sparkler if available' },
        ],
      },
    ];

    const seededOrders: any[] = [];
    for (const ord of sampleOrdersData) {
      let existingOrder = await Order.findOne({ restaurantId: restaurant._id, orderNumber: ord.orderNumber });
      if (!existingOrder && ord.table && ord.orderItems && ord.orderItems.length > 0) {
        const isClosed = ord.status === 'SERVED';

        // Build item array and subtotal
        let orderSubtotal = 0;
        const mappedItems = ord.orderItems.map((oi) => {
          const itemDoc = oi.item;
          const unitPrice = itemDoc.variants && itemDoc.variants.length > 0 ? itemDoc.variants[0].price : itemDoc.price;
          const itemSubtotal = unitPrice * oi.qty;
          const itemTax = Math.round(itemSubtotal * 0.05);
          const itemTotal = itemSubtotal + itemTax;
          orderSubtotal += itemSubtotal;

          return {
            menuItemId: itemDoc._id,
            nameSnapshot: itemDoc.name,
            unitPriceSnapshot: unitPrice,
            originalPriceSnapshot: itemDoc.originalPrice,
            isCombo: !!itemDoc.isCombo,
            comboItemsSnapshot: itemDoc.comboItems && itemDoc.comboItems.length > 0
              ? itemDoc.comboItems.map((ci: any) => ({
                  name: ci.name,
                  quantity: ci.quantity || 1,
                  categoryName: ci.categoryName,
                }))
              : undefined,
            variantName: itemDoc.variants && itemDoc.variants.length > 0 ? itemDoc.variants[0].name : undefined,
            quantity: oi.qty,
            selectedAddOns: [],
            specialInstructions: oi.instructions || undefined,
            prepTimeMinutesSnapshot: itemDoc.prepTimeMinutes,
            itemSubtotal,
            itemTax,
            itemTotal,
            itemStatus:
              ord.status === 'SERVED'
                ? 'SERVED'
                : ord.status === 'READY'
                  ? 'READY'
                  : ord.status === 'PREPARING'
                    ? 'PREPARING'
                    : 'PENDING',
            servedAt: ord.status === 'SERVED' ? new Date() : undefined,
          };
        });

        const taxAmount = Math.round(orderSubtotal * 0.05);
        const total = orderSubtotal + taxAmount;

        let session: any = null;
        let guestSession: any = null;

        if (ord.table) {
          if (ord.mode === 'DINE_IN' && !isClosed) {
            session = await DiningSession.findOne({
              restaurantId: restaurant._id,
              tableId: ord.table._id,
              status: { $in: ['ACTIVE', 'BILL_REQUESTED'] },
            });
          }

          if (!session) {
            const isSessionActive = ord.mode === 'DINE_IN' && !isClosed;
            session = await DiningSession.create({
              restaurantId: restaurant._id,
              tableId: ord.table._id,
              sessionCode: `S-${1000 + ord.orderNumber}`,
              joinPin: '1234',
              status: isSessionActive ? 'ACTIVE' : 'SETTLED',
              paymentMode: 'POSTPAID',
              roundCount: 1,
              guestCount: 2,
              subtotal: orderSubtotal,
              tax: taxAmount,
              taxBreakdown: [
                { name: 'CGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
                { name: 'SGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
              ],
              discount: 0,
              serviceCharge: 0,
              total,
              paidAmount: isClosed || ord.paymentStatus === 'PAID' ? total : 0,
              balanceDue: isClosed || ord.paymentStatus === 'PAID' ? 0 : total,
              openedAt: new Date(Date.now() - (120 - (ord.orderNumber - 100) * 5) * 60 * 1000),
              closedAt: isSessionActive ? undefined : new Date(),
            });
          }

          guestSession = await GuestSession.findOne({ diningSessionId: session._id });
          if (!guestSession) {
            guestSession = await GuestSession.create({
              diningSessionId: session._id,
              restaurantId: restaurant._id,
              tableId: ord.table._id,
              guestToken: `guestTokenSeedOrd${ord.orderNumber}`,
              guestName: ord.customerName || 'Demo Guest',
              isHost: true,
              lastSeenAt: new Date(),
            });
          }
        }

        existingOrder = await Order.create({
          restaurantId: restaurant._id,
          orderNumber: ord.orderNumber,
          diningSessionId: session?._id,
          guestSessionId: guestSession?._id,
          customerId: ord.customer?._id,
          customerName: ord.customerName,
          customerPhone: ord.customerPhone,
          tableId: ord.table?._id,
          tableNameSnapshot: ord.table?.displayName,
          orderMode: ord.mode,
          source: ord.source,
          status: ord.status,
          paymentStatus: ord.paymentStatus,
          subtotal: orderSubtotal,
          tax: taxAmount,
          total,
          taxBreakdown: [
            { name: 'CGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
            { name: 'SGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
          ],
          customerNote: ord.customerNote,
          items: mappedItems,
          integrationMetadata: {
            petpoojaOrderId: `PP_ORD_${ord.orderNumber}`,
            syncedAt: new Date(),
          },
        });

        if (isClosed || ord.paymentStatus === 'PAID') {
          const bill = await Bill.create({
            restaurantId: restaurant._id,
            tableId: ord.table?._id,
            diningSessionId: session?._id,
            billNumber: `BILL-${ord.orderNumber}`,
            version: 1,
            subtotal: orderSubtotal,
            taxAmount,
            taxBreakdown: [
              { name: 'CGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
              { name: 'SGST', percentage: 2.5, amount: Math.round(taxAmount / 2) },
            ],
            discountAmount: 0,
            serviceChargeAmount: 0,
            netAmount: total,
            paidAmount: total,
            balanceDue: 0,
            status: 'SETTLED',
            generatedBy: manager._id,
            settledAt: new Date(),
          });

          await Payment.create({
            restaurantId: restaurant._id,
            diningSessionId: session?._id,
            billId: bill._id,
            orderId: existingOrder._id,
            amount: total,
            currency: 'INR',
            provider: ord.paymentProvider || 'CASH',
            method: ord.paymentProvider === 'RAZORPAY' ? 'CARD' : 'CASH',
            status: 'CAPTURED',
            providerReferenceId: `tx_ref_${ord.orderNumber}_${Date.now()}`,
            capturedAt: new Date(),
          });
        }
        logger.info(`Sample order ORD-${ord.orderNumber} seeded (${mappedItems.length} items, status: ${ord.status}, mode: ${ord.mode}).`);
      }

      if (existingOrder) {
        seededOrders.push({ order: existingOrder, meta: ord });
      }
    }

    if (orderCounter) {
      orderCounter.seq = 120;
      await orderCounter.save();
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
    // 10b. Seed POS Shifts (Active Shift & Historical Z-Report Shift)
    // ------------------------------------------------------------------------
    logger.info('Seeding sample POS Cash Drawer Shifts...');
    const existingActiveShift = await Shift.findOne({ restaurantId: restaurant._id, status: 'OPEN' });
    if (!existingActiveShift) {
      await Shift.create({
        restaurantId: restaurant._id,
        staffId: manager._id,
        shiftNumber: 102,
        openedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        openingFloat: 250000, // ₹2,500.00
        cashIn: 50000, // ₹500.00
        cashOut: 20000, // ₹200.00
        pettyCashEntries: [
          {
            type: 'CASH_IN',
            amount: 50000,
            category: 'FLOAT_TOPUP',
            reason: 'Counter Cash Refill from safe',
            staffId: manager._id,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          },
          {
            type: 'CASH_OUT',
            amount: 20000,
            category: 'SUPPLIES',
            reason: 'Emergency dairy milk purchase',
            staffId: manager._id,
            createdAt: new Date(Date.now() - 60 * 60 * 1000),
          },
        ],
        cashSales: 50000, // ₹500.00
        cardSales: 25200, // ₹252.00
        upiSales: 16000, // ₹160.00
        totalSales: 91200,
        orderCount: 4,
        expectedCashInDrawer: 250000 + 50000 + 50000 - 20000, // 330000 (₹3,300.00)
        status: 'OPEN',
      });
      logger.info('Active POS Shift seeded for Demo Manager with ₹2,500 float.');
    }

    const existingClosedShift = await Shift.findOne({ restaurantId: restaurant._id, status: 'CLOSED' });
    if (!existingClosedShift) {
      await Shift.create({
        restaurantId: restaurant._id,
        staffId: manager._id,
        shiftNumber: 101,
        openedAt: new Date(Date.now() - 28 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
        openingFloat: 200000,
        cashIn: 0,
        cashOut: 15000,
        pettyCashEntries: [
          {
            type: 'CASH_OUT',
            amount: 15000,
            category: 'SUPPLIES',
            reason: 'Kitchen cleaning supplies',
            staffId: manager._id,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        ],
        cashSales: 154000,
        cardSales: 88000,
        upiSales: 62000,
        totalSales: 304000,
        orderCount: 18,
        expectedCashInDrawer: 339000,
        actualCashCounted: 339000,
        discrepancyAmount: 0,
        closingNotes: 'Smooth evening shift. Perfect cash reconciliation.',
        closedBy: manager._id,
        status: 'CLOSED',
      });
      logger.info('Yesterday Closed POS Shift (Z-Report) seeded.');
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
          details: { planKey: 'ENTERPRISE', flagsCount: 19 },
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

    cacheService.clear();
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
