import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { MenuItem } from '../models/MenuItem';
import { logger } from './logger';

dotenv.config();

export async function migratePhase10() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixora-qr';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  logger.info('Starting Phase 10 (Petpooja Integration) Data Migration...');

  // 1. Backfill default integrationConfig on RestaurantSettings
  const settingsList = await RestaurantSettings.find({});
  let settingsUpdated = 0;

  for (const settings of settingsList) {
    if (!settings.paymentConfig) {
      settings.paymentConfig = {
        activeProvider: 'CASH',
        activeMode: 'POSTPAID',
        taxRatePercent: 0,
        paymentMethods: { cash: true, card: true, upi: true, razorpay: false },
        integrationConfig: { provider: 'NONE', config: {} },
      };
      await settings.save();
      settingsUpdated++;
    } else if (!settings.paymentConfig.integrationConfig) {
      settings.paymentConfig.integrationConfig = { provider: 'NONE', config: {} };
      await settings.save();
      settingsUpdated++;
    }
  }

  logger.info(`Updated integrationConfig for ${settingsUpdated} RestaurantSettings documents.`);

  // 2. Ensure MenuItem schema compatibility for externalIds
  const itemsWithoutExternalIds = await MenuItem.find({
    $or: [{ externalIds: { $exists: false } }, { externalIds: null }],
  });

  let itemsUpdated = 0;
  for (const item of itemsWithoutExternalIds) {
    item.externalIds = {};
    await item.save();
    itemsUpdated++;
  }

  logger.info(`Initialized externalIds for ${itemsUpdated} MenuItem documents.`);
  logger.info('Phase 10 Data Migration completed successfully!');
}

if (require.main === module) {
  migratePhase10()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err, 'Phase 10 migration failed');
      process.exit(1);
    });
}
