import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { logger } from './logger';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const plans = [
  {
    key: 'FREE',
    name: 'Free',
    description: 'Basic QR Menu with no transactional features.',
    includedFeatureKeys: ['qr_menu'],
  },
  {
    key: 'STARTER',
    name: 'Starter',
    description: 'Core menu browsing, ordering, and waiter call features.',
    includedFeatureKeys: ['qr_menu', 'waiter_call', 'ordering', 'analytics'],
  },
  {
    key: 'PROFESSIONAL',
    name: 'Professional',
    description: 'Advanced features including payments and promotional tools.',
    includedFeatureKeys: ['qr_menu', 'waiter_call', 'ordering', 'analytics', 'payments', 'coupons'],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Full platform access including white labeling, API access, and deep integrations.',
    includedFeatureKeys: [
      'qr_menu', 'ordering', 'waiter_call', 'analytics', 'payments', 'kds',
      'inventory', 'customer_display', 'delivery', 'takeaway', 'white_label',
      'pos', 'coupons', 'loyalty', 'crm', 'api_access'
    ],
  },
];

async function runPhase3Migration() {
  try {
    logger.info('Connecting to database for Phase 3 migration...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }
    await mongoose.connect(mongoUri);

    // 1. Seed Subscription Plans
    logger.info('Seeding subscription plans...');
    for (const plan of plans) {
      await SubscriptionPlan.findOneAndUpdate(
        { key: plan.key },
        { $set: plan },
        { upsert: true, new: true }
      );
    }
    logger.info('Subscription plans seeded successfully.');

  } catch (error) {
    logger.error('Phase 3 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database.');
    process.exit(0);
  }
}

runPhase3Migration();
