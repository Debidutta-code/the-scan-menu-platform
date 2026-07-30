import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Restaurant } from '../models/Restaurant';
import { RestaurantSettings } from '../models/RestaurantSettings';
import { RestaurantOnboarding } from '../models/RestaurantOnboarding';
import { counterService } from '../services/counter.service';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { logger } from './logger';

dotenv.config();

export async function migratePhase4() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pixora-qr';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  logger.info('Starting Phase 4 Data Migration...');

  const restaurants = await Restaurant.find({});
  logger.info(`Found ${restaurants.length} restaurants to process.`);

  for (const rest of restaurants) {
    const rawDoc: any = rest.toObject();

    // 1. Ensure sequential code
    if (!rest.code) {
      rest.code = await counterService.getNextSequence('restaurant_code', 'RST-', 6);
    }

    // 2. Map legacy isActive to status
    if (!rest.status || (rawDoc.isActive !== undefined && !['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'ARCHIVED'].includes(rest.status))) {
      rest.status = rawDoc.isActive === false ? 'SUSPENDED' : 'ACTIVE';
    }

    await rest.save();

    // 3. Ensure RestaurantSettings
    let settings = await RestaurantSettings.findOne({ restaurantId: rest._id });
    if (!settings) {
      settings = new RestaurantSettings({
        restaurantId: rest._id,
        currency: rawDoc.currency || 'INR',
        timezone: rawDoc.timezone || 'Asia/Kolkata',
        theme: rawDoc.theme || {
          primaryColor: '#111827',
          secondaryColor: '#FFFFFF',
          accentColor: '#F59E0B',
          fontFamily: 'Plus Jakarta Sans',
        },
        branding: {
          logoUrl: rawDoc.logoUrl || '',
          coverImageUrl: rawDoc.coverImageUrl || '',
          googleReviewUrl: rawDoc.googleReviewUrl || '',
          whatsapp: rawDoc.whatsapp || '',
          socialLinks: rawDoc.socialLinks || { facebook: '', instagram: '', twitter: '' },
        },
        workflow: {
          orderWorkflowMode: rawDoc.orderWorkflowMode || 'FIVE_STEP',
          autoAcceptConfig: rawDoc.autoAcceptConfig || { enabled: false, delaySeconds: 10 },
        },
        paymentConfig: {
          taxRatePercent: rawDoc.taxRatePercent || 0,
          paymentMethods: rawDoc.paymentMethods || { cash: true, card: true, upi: true, razorpay: false },
          razorpayConfig: rawDoc.razorpayConfig || { keyId: '', keySecret: '' },
          integrationConfig: rawDoc.integrationConfig || { provider: 'NONE', config: {} },
          gstNumber: rawDoc.gstNumber || '',
        },
        timings: rawDoc.timings || { open: '09:00', close: '23:00' },
      });
      await settings.save();
      logger.info(`Created RestaurantSettings for restaurant: ${rest.name} (${rest.code})`);
    }

    // 4. Ensure RestaurantStats
    await restaurantStatsService.recalculateStats(rest._id);
    logger.info(`Recalculated RestaurantStats for restaurant: ${rest.name} (${rest.code})`);

    // 5. Ensure RestaurantOnboarding
    let onboarding = await RestaurantOnboarding.findOne({ restaurantId: rest._id });
    if (!onboarding) {
      onboarding = new RestaurantOnboarding({
        restaurantId: rest._id,
        restaurantCreated: true,
        managerCreated: true,
        tablesCreated: true,
        menuImported: true,
        paymentsConfigured: true,
        subscriptionAssigned: true,
        completed: true,
      });
      await onboarding.save();
      logger.info(`Created RestaurantOnboarding for restaurant: ${rest.name} (${rest.code})`);
    }
  }

  logger.info('Phase 4 Data Migration completed successfully!');
}

if (require.main === module) {
  migratePhase4()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err, 'Phase 4 migration failed');
      process.exit(1);
    });
}
