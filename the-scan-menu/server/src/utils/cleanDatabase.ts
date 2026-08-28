import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
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
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Counter } from '../models/Counter';
import { Shift } from '../models/Shift';
import { LoyaltyLedger } from '../models/LoyaltyLedger';
import { PlatformSettings } from '../models/PlatformSettings';
import { logger } from './logger';
import config from '../config';

dotenv.config();

const getCounts = async () => ({
  Users: await User.countDocuments(),
  Restaurants: await Restaurant.countDocuments(),
  RestaurantStaff: await RestaurantStaff.countDocuments(),
  Customers: await Customer.countDocuments(),
  RestaurantSettings: await RestaurantSettings.countDocuments(),
  PlatformSettings: await PlatformSettings.countDocuments(),
  RestaurantStats: await RestaurantStats.countDocuments(),
  RestaurantOnboarding: await RestaurantOnboarding.countDocuments(),
  SubscriptionPlans: await SubscriptionPlan.countDocuments(),
  Categories: await Category.countDocuments(),
  MenuItems: await MenuItem.countDocuments(),
  CustomizationGroups: await CustomizationGroup.countDocuments(),
  Tables: await Table.countDocuments(),
  TableZones: await TableZone.countDocuments(),
  TableSessions: await TableSession.countDocuments(),
  DiningSessions: await DiningSession.countDocuments(),
  GuestSessions: await GuestSession.countDocuments(),
  CheckoutAttempts: await CheckoutAttempt.countDocuments(),
  Bills: await Bill.countDocuments(),
  BillCounters: await BillCounter.countDocuments(),
  Payments: await Payment.countDocuments(),
  Orders: await Order.countDocuments(),
  OrderCounters: await OrderCounter.countDocuments(),
  IdempotencyRecords: await IdempotencyRecord.countDocuments(),
  Transactions: await Transaction.countDocuments(),
  InventoryLogs: await InventoryLog.countDocuments(),
  AuditLogs: await AuditLog.countDocuments(),
  WaiterCalls: await WaiterCall.countDocuments(),
  IntegrationSyncLogs: await IntegrationSyncLog.countDocuments(),
  ApiKeys: await ApiKey.countDocuments(),
  WebhookSubscriptions: await WebhookSubscription.countDocuments(),
  Taxes: await Tax.countDocuments(),
  FeatureFlags: await FeatureFlag.countDocuments(),
  Counters: await Counter.countDocuments(),
  RefreshTokens: await RefreshToken.countDocuments(),
  DeviceTokens: await DeviceToken.countDocuments(),
  OtpSessions: await OtpSession.countDocuments(),
  Shifts: await Shift.countDocuments(),
  LoyaltyLedgers: await LoyaltyLedger.countDocuments(),
});

export const cleanDatabase = async (options: { operationalOnly?: boolean } = {}) => {
  const mongoURI = config.db.mongoUri;
  const isOperationalOnly = options.operationalOnly || process.argv.includes('--operational');

  try {
    logger.info(`Connecting to database at ${mongoURI} for cleanup...`);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    logger.info('--- Database Collection Counts Before Cleanup ---');
    const countsBefore = await getCounts();
    console.table(countsBefore);

    if (!isOperationalOnly) {
      logger.warn('Full database wipe: Deleting ALL collections completely...');
      await Promise.all([
        User.deleteMany({}),
        Restaurant.deleteMany({}),
        RestaurantStaff.deleteMany({}),
        Customer.deleteMany({}),
        RestaurantSettings.deleteMany({}),
        PlatformSettings.deleteMany({}),
        RestaurantStats.deleteMany({}),
        RestaurantOnboarding.deleteMany({}),
        SubscriptionPlan.deleteMany({}),
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
        Counter.deleteMany({}),
        RefreshToken.deleteMany({}),
        DeviceToken.deleteMany({}),
        OtpSession.deleteMany({}),
        Shift.deleteMany({}),
        LoyaltyLedger.deleteMany({}),
      ]);
    } else {
      logger.info('Cleaning operational data only (Preserving Users & Restaurants)...');

      // Delete operational & transactional data
      await Promise.all([
        Order.deleteMany({}),
        OrderCounter.deleteMany({}),
        DiningSession.deleteMany({}),
        GuestSession.deleteMany({}),
        CheckoutAttempt.deleteMany({}),
        Bill.deleteMany({}),
        BillCounter.deleteMany({}),
        Payment.deleteMany({}),
        IdempotencyRecord.deleteMany({}),
        Transaction.deleteMany({}),
        InventoryLog.deleteMany({}),
        AuditLog.deleteMany({}),
        WaiterCall.deleteMany({}),
        IntegrationSyncLog.deleteMany({}),
        ApiKey.deleteMany({}),
        WebhookSubscription.deleteMany({}),
        RefreshToken.deleteMany({}),
        DeviceToken.deleteMany({}),
        OtpSession.deleteMany({}),
        MenuItem.deleteMany({}),
        CustomizationGroup.deleteMany({}),
        Category.deleteMany({}),
        Table.deleteMany({}),
        TableZone.deleteMany({}),
        TableSession.deleteMany({}),
        Tax.deleteMany({}),
        Customer.deleteMany({}),
        FeatureFlag.deleteMany({}),
        Shift.deleteMany({}),
        LoyaltyLedger.deleteMany({}),
      ]);

      // Reset RestaurantStats to zero for preserved restaurants
      await RestaurantStats.updateMany(
        {},
        {
          $set: {
            menuItemsCount: 0,
            tablesCount: 0,
            totalOrdersCount: 0,
            activeOrdersCount: 0,
            completedOrdersCount: 0,
            cancelledOrdersCount: 0,
            totalRevenue: 0,
            todayRevenue: 0,
            todayOrdersCount: 0,
          },
        }
      );
    }

    logger.info('--- Database Collection Counts After Cleanup ---');
    const countsAfter = await getCounts();
    console.table(countsAfter);

    logger.info(
      !isOperationalOnly
        ? 'Full database wipe completed successfully! Entire database is empty.'
        : 'Operational cleanup completed successfully! Users and Restaurants preserved.'
    );
  } catch (err) {
    logger.error(err, 'Error during database cleanup');
    throw err;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('Disconnected from database.');
    }
  }
};

if (require.main === module) {
  cleanDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default cleanDatabase;
