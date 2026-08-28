import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Counter } from '../models/Counter';
import { Restaurant } from '../models/Restaurant';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { Customer } from '../models/Customer';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { RestaurantStats } from '../models/RestaurantStats';
import { RestaurantOnboarding } from '../models/RestaurantOnboarding';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { CustomizationGroup } from '../models/CustomizationGroup';
import { Table } from '../models/Table';
import { TableZone } from '../models/TableZone';
import { TableSession } from '../models/TableSession';
import { DiningSession } from '../models/DiningSession';
import { GuestSession } from '../models/GuestSession';
import { CheckoutAttempt } from '../models/CheckoutAttempt';
import { Bill } from '../models/Bill';
import { BillCounter } from '../models/BillCounter';
import { Payment } from '../models/Payment';
import { IdempotencyRecord } from '../models/IdempotencyRecord';
import { Order, OrderCounter } from '../models/Order';
import { WaiterCall } from '../models/WaiterCall';
import { IntegrationSyncLog } from '../models/IntegrationSyncLog';
import { RefreshToken } from '../models/RefreshToken';
import { DeviceToken } from '../models/DeviceToken';
import { OtpSession } from '../models/OtpSession';
import { ApiKey } from '../models/ApiKey';
import { WebhookSubscription } from '../models/WebhookSubscription';
import { InventoryLog } from '../models/InventoryLog';
import { Transaction } from '../models/Transaction';
import { AuditLog } from '../models/AuditLog';
import { Tax } from '../models/Tax';
import { FeatureFlag } from '../models/FeatureFlag';
import { Shift } from '../models/Shift';
import { LoyaltyLedger } from '../models/LoyaltyLedger';
import { PlatformSettings } from '../models/PlatformSettings';
import { logger } from './logger';
import config from '../config';

dotenv.config();

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com';
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Test@1234';
const DEFAULT_PIN = '1234';

export const seedAdminOnly = async (options: { cleanTenants?: boolean } = {}) => {
  const mongoURI = config.db.mongoUri;
  const isClean = options.cleanTenants || process.argv.includes('--clean') || process.argv.includes('--fresh');

  try {
    logger.info(`Connecting to database for SuperAdmin setup...`);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    if (isClean) {
      logger.info('--- Cleaning all tenant and operational data for a fresh start ---');
      await Promise.all([
        Restaurant.deleteMany({}),
        RestaurantStaff.deleteMany({}),
        Customer.deleteMany({}),
        RestaurantSettings.deleteMany({}),
        PlatformSettings.deleteMany({}),
        RestaurantStats.deleteMany({}),
        RestaurantOnboarding.deleteMany({}),
        Category.deleteMany({}),
        MenuItem.deleteMany({}),
        CustomizationGroup.deleteMany({}),
        Table.deleteMany({}),
        TableZone.deleteMany({}),
        TableSession.deleteMany({}),
        DiningSession.deleteMany({}),
        GuestSession.deleteMany({}),
        CheckoutAttempt.deleteMany({}),
        Bill.deleteMany({}),
        BillCounter.deleteMany({}),
        Payment.deleteMany({}),
        Order.deleteMany({}),
        OrderCounter.deleteMany({}),
        IdempotencyRecord.deleteMany({}),
        Transaction.deleteMany({}),
        InventoryLog.deleteMany({}),
        AuditLog.deleteMany({}),
        WaiterCall.deleteMany({}),
        IntegrationSyncLog.deleteMany({}),
        ApiKey.deleteMany({}),
        WebhookSubscription.deleteMany({}),
        Tax.deleteMany({}),
        FeatureFlag.deleteMany({}),
        RefreshToken.deleteMany({}),
        DeviceToken.deleteMany({}),
        OtpSession.deleteMany({}),
        Shift.deleteMany({}),
        LoyaltyLedger.deleteMany({}),
        // Delete all non-superadmin users
        User.deleteMany({ role: { $ne: 'SUPER_ADMIN' } }),
      ]);
      logger.info('All tenant data wiped clean.');
    }

    // ------------------------------------------------------------------------
    // 1. Seed Global Subscription Plans (Required for tenant provisioning)
    // ------------------------------------------------------------------------
    logger.info('Seeding Global Subscription Plans...');
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
    // 2. Initialize Sequence Counters
    // ------------------------------------------------------------------------
    logger.info('Initializing Sequence Counters...');
    await Counter.findOneAndUpdate(
      { name: 'restaurant_code' },
      { $setOnInsert: { name: 'restaurant_code', seq: 1 } },
      { upsert: true }
    );
    await Counter.findOneAndUpdate(
      { name: 'order_number' },
      { $setOnInsert: { name: 'order_number', seq: 1 } },
      { upsert: true }
    );

    // ------------------------------------------------------------------------
    // 3. Seed / Refresh SUPER_ADMIN User
    // ------------------------------------------------------------------------
    logger.info(`Setting up SUPER_ADMIN (${ADMIN_EMAIL})...`);
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
      logger.info('SUPER_ADMIN account created successfully.');
    } else {
      superAdmin.email = ADMIN_EMAIL;
      superAdmin.role = 'SUPER_ADMIN';
      superAdmin.name = 'Super Admin';
      superAdmin.passwordHash = hashedPassword;
      superAdmin.isActive = true;
      superAdmin.pin = DEFAULT_PIN;
      await superAdmin.save();
      logger.info(`SUPER_ADMIN account updated & password refreshed.`);
    }

    // 3. Seed Default PlatformSettings (Global Loyalty & Controls)
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

    console.log('\n' + '='.repeat(60));
    console.log(' SUPERADMIN SETUP COMPLETE');
    console.log('='.repeat(60));
    console.log(` Superadmin Email    : ${ADMIN_EMAIL}`);
    console.log(` Superadmin Password : ${ADMIN_PASSWORD}`);
    console.log(` PIN                 : ${DEFAULT_PIN}`);
    console.log(` Role                : SUPER_ADMIN`);
    console.log(` Portal URL          : http://localhost:5173/admin/login`);
    console.log('='.repeat(60));
    console.log(' You can now login as Superadmin and provision custom outlets!');
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    logger.error(err, 'Error seeding SuperAdmin');
    throw err;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('Disconnected from database.');
    }
  }
};

if (require.main === module) {
  seedAdminOnly()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedAdminOnly;
