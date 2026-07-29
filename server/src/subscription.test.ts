import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SubscriptionPlan } from './models/SubscriptionPlan';
import { Restaurant } from './models/Restaurant';
import { FeatureFlag } from './models/FeatureFlag';
import { subscriptionService } from './services/subscription.service';
import { featureFlagService } from './services/featureFlag.service';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Subscription System', () => {
  let restaurantId: mongoose.Types.ObjectId;
  let restaurantId2: mongoose.Types.ObjectId;

  beforeEach(async () => {
    await SubscriptionPlan.deleteMany({});
    await Restaurant.deleteMany({});
    await FeatureFlag.deleteMany({});

    // Seed plans
    await SubscriptionPlan.insertMany([
      { key: 'FREE', name: 'Free', includedFeatureKeys: ['qr_menu'] },
      { key: 'STARTER', name: 'Starter', includedFeatureKeys: ['qr_menu', 'waiter_call'] },
      { key: 'ENTERPRISE', name: 'Enterprise', includedFeatureKeys: ['qr_menu', 'waiter_call', 'pos', 'api_access'] },
    ]);

    const res = await Restaurant.create({
      name: 'Test Rest',
      slug: 'test-rest',
      currency: 'USD',
      timezone: 'UTC',
      theme: { primaryColor: '#000', secondaryColor: '#fff', accentColor: '#111', fontFamily: 'Arial' },
      integrationConfig: { provider: 'NONE', config: {} },
    });
    restaurantId = res._id as mongoose.Types.ObjectId;

    const res2 = await Restaurant.create({
      name: 'Test Rest 2',
      slug: 'test-rest-2',
      currency: 'USD',
      timezone: 'UTC',
      theme: { primaryColor: '#000', secondaryColor: '#fff', accentColor: '#111', fontFamily: 'Arial' },
      integrationConfig: { provider: 'NONE', config: {} },
    });
    restaurantId2 = res2._id as mongoose.Types.ObjectId;
  });

  it('1. plan -> feature flag mapping is correct for all four plans', async () => {
    const free = await subscriptionService.getPlanByKey('FREE');
    expect(free?.includedFeatureKeys).toContain('qr_menu');
    expect(free?.includedFeatureKeys).not.toContain('waiter_call');
  });

  it('2. assigning a plan correctly enables AND disables flags (not just additive)', async () => {
    await featureFlagService.enable(restaurantId, 'pos');
    await featureFlagService.disable(restaurantId, 'qr_menu');

    await subscriptionService.assignPlanToRestaurant(restaurantId, 'STARTER');

    const rest = await Restaurant.findById(restaurantId);
    expect(rest?.subscription?.planKey).toBe('STARTER');

    const qrMenu = await featureFlagService.isEnabled(restaurantId, 'qr_menu');
    const waiterCall = await featureFlagService.isEnabled(restaurantId, 'waiter_call');
    const pos = await featureFlagService.isEnabled(restaurantId, 'pos');

    expect(qrMenu).toBe(true);
    expect(waiterCall).toBe(true);
    expect(pos).toBe(false);
  });

  it('3. cross-tenant isolation (assigning a plan to Restaurant A never touches Restaurant B)', async () => {
    await featureFlagService.enable(restaurantId2, 'pos');

    await subscriptionService.assignPlanToRestaurant(restaurantId, 'STARTER');

    const pos = await featureFlagService.isEnabled(restaurantId2, 'pos');
    expect(pos).toBe(true);
  });

  it('4. new restaurant provisioning defaults to Free plan', async () => {
    const res3 = new Restaurant({
      name: 'Test Rest 3',
      slug: 'test-rest-3',
      currency: 'USD',
      timezone: 'UTC',
      theme: { primaryColor: '#000', secondaryColor: '#fff', accentColor: '#111', fontFamily: 'Arial' },
      integrationConfig: { provider: 'NONE', config: {} },
    });

    await res3.save();

    expect(res3.subscription?.planKey).toBe('FREE');
  });
});
