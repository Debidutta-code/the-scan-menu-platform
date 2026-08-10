import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { RestaurantStaff } from '../models/RestaurantStaff';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { RestaurantStats } from '../models/RestaurantStats';
import { RestaurantOnboarding } from '../models/RestaurantOnboarding';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { Table } from '../models/Table';
import { TableZone } from '../models/TableZone';
import { TableSession } from '../models/TableSession';
import { Order, OrderCounter } from '../models/Order';
import { WaiterCall } from '../models/WaiterCall';
import { IntegrationSyncLog } from '../models/IntegrationSyncLog';
import { RefreshToken } from '../models/RefreshToken';
import { ApiKey } from '../models/ApiKey';
import { WebhookSubscription } from '../models/WebhookSubscription';
import { InventoryLog } from '../models/InventoryLog';
import { Transaction } from '../models/Transaction';
import { AuditLog } from '../models/AuditLog';
import { Tax } from '../models/Tax';
import { FeatureFlag } from '../models/FeatureFlag';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Counter } from '../models/Counter';
import { logger } from './logger';

dotenv.config();

const getCounts = async () => ({
  Users: await User.countDocuments(),
  Restaurants: await Restaurant.countDocuments(),
  RestaurantStaff: await RestaurantStaff.countDocuments(),
  RestaurantSettings: await RestaurantSettings.countDocuments(),
  RestaurantStats: await RestaurantStats.countDocuments(),
  RestaurantOnboarding: await RestaurantOnboarding.countDocuments(),
  SubscriptionPlans: await SubscriptionPlan.countDocuments(),
  Categories: await Category.countDocuments(),
  MenuItems: await MenuItem.countDocuments(),
  Tables: await Table.countDocuments(),
  TableZones: await TableZone.countDocuments(),
  TableSessions: await TableSession.countDocuments(),
  Orders: await Order.countDocuments(),
  OrderCounters: await OrderCounter.countDocuments(),
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
});

export const cleanDatabase = async (options: { wipeAll?: boolean } = {}) => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr';
  const isFullWipe = options.wipeAll || process.argv.includes('--all') || process.argv.includes('--full');

  try {
    logger.info(`Connecting to database at ${mongoURI} for cleanup...`);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    logger.info('--- Database Collection Counts Before Cleanup ---');
    const countsBefore = await getCounts();
    console.table(countsBefore);

    if (isFullWipe) {
      logger.warn('Full wipe requested: Deleting all collections completely...');
      await Promise.all([
        User.deleteMany({}),
        Restaurant.deleteMany({}),
        RestaurantStaff.deleteMany({}),
        RestaurantSettings.deleteMany({}),
        RestaurantStats.deleteMany({}),
        RestaurantOnboarding.deleteMany({}),
        SubscriptionPlan.deleteMany({}),
        Category.deleteMany({}),
        MenuItem.deleteMany({}),
        Table.deleteMany({}),
        TableZone.deleteMany({}),
        TableSession.deleteMany({}),
        Order.deleteMany({}),
        OrderCounter.deleteMany({}),
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
      ]);
    } else {
      logger.info('Cleaning operational data (Orders, Sessions, Menus, Tables, Logs, Keys, Taxes)...');
      
      // Delete operational & transactional data
      await Promise.all([
        Order.deleteMany({}),
        OrderCounter.deleteMany({}),
        TableSession.deleteMany({}),
        Transaction.deleteMany({}),
        InventoryLog.deleteMany({}),
        AuditLog.deleteMany({}),
        WaiterCall.deleteMany({}),
        IntegrationSyncLog.deleteMany({}),
        ApiKey.deleteMany({}),
        WebhookSubscription.deleteMany({}),
        RefreshToken.deleteMany({}),
        MenuItem.deleteMany({}),
        Category.deleteMany({}),
        Table.deleteMany({}),
        TableZone.deleteMany({}),
        Tax.deleteMany({}),
        FeatureFlag.deleteMany({}),
      ]);

      // Reset RestaurantStats to zero for preserved restaurants
      await RestaurantStats.updateMany(
        {},
        {
          $set: {
            menuItemsCount: 0,
            tablesCount: 0,
            ordersCount: 0,
            activeOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            revenue: 0,
            todayRevenue: 0,
            todayOrders: 0,
          },
        }
      );
    }

    logger.info('--- Database Collection Counts After Cleanup ---');
    const countsAfter = await getCounts();
    console.table(countsAfter);

    logger.info(
      isFullWipe
        ? 'Full database wipe completed successfully! All collections are clean.'
        : 'Operational cleanup completed successfully! Users, Restaurants, and Settings preserved.'
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
