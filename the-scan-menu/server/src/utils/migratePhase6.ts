import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RestaurantSettings } from '../models/RestaurantSettings';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixora-qr-menu';

async function migratePhase6() {
  console.log('Starting Phase 6 Payment Config Migration...');
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const settingsList = await RestaurantSettings.find({});
    let count = 0;

    for (const settings of settingsList) {
      let updated = false;

      if (!settings.paymentConfig.activeProvider) {
        settings.paymentConfig.activeProvider = 'CASH';
        updated = true;
      }
      if (!settings.paymentConfig.activeMode) {
        settings.paymentConfig.activeMode = 'POSTPAID';
        updated = true;
      }

      if (updated) {
        await settings.save();
        count++;
      }
    }

    console.log(`Migration completed successfully. Updated ${count} RestaurantSettings documents.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migratePhase6();
