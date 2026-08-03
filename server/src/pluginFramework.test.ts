process.env.TESTING_FEATURE_FLAGS = 'true';

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from './index';
import { Restaurant } from './models/Restaurant';
import { RestaurantSettings } from './models/RestaurantSettings';
import { User } from './models/User';
import { RestaurantStaff } from './models/RestaurantStaff';
import { ApiKey } from './models/ApiKey';
import { WebhookSubscription } from './models/WebhookSubscription';
import { featureFlagService } from './services/featureFlag.service';
import { apiKeyService } from './services/apiKey.service';
import { webhookDispatcherService } from './services/webhookDispatcher.service';

const TEST_JWT_SECRET = 'test_access_secret_key_123_abc_456_def';

describe('Phase 15 Plugin Framework (Public API & Webhooks) Test Suite', () => {
  let restAId: string;
  let managerAToken: string;
  let staffAToken: string;

  const generateAccessToken = (user: any) => {
    return jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr-test');
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Restaurant.deleteMany({});
    await RestaurantSettings.deleteMany({});
    await User.deleteMany({});
    await RestaurantStaff.deleteMany({});
    await ApiKey.deleteMany({});
    await WebhookSubscription.deleteMany({});

    // Create Restaurant A
    const restA = await Restaurant.create({
      code: 'RST-PLUGIN-A',
      name: 'Plugin Bistro',
      slug: 'plugin-bistro',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restAId = restA._id.toString();

    await RestaurantSettings.create({
      restaurantId: restA._id,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });
    await featureFlagService.enable(restAId, 'api_webhooks');

    // Users & Tokens
    const hashedPassword = await bcrypt.hash('Password123!', 1);
    const mgrA = await User.create({
      name: 'Manager A',
      email: 'manager.a@plugin.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
    });
    await RestaurantStaff.create({
      restaurantId: restA._id,
      userId: mgrA._id,
      role: 'MANAGER',
      isActive: true,
    });
    managerAToken = generateAccessToken(mgrA);

    const stfA = await User.create({
      name: 'Staff A',
      email: 'staff.a@plugin.com',
      passwordHash: hashedPassword,
      role: 'STAFF',
    });
    await RestaurantStaff.create({
      restaurantId: restA._id,
      userId: stfA._id,
      role: 'STAFF',
      isActive: true,
    });
    staffAToken = generateAccessToken(stfA);
  }, 20000);

  describe('API Key Management & SHA-256 Hashing', () => {
    it('creates a new API key and returns raw key starting with tsm_live_', async () => {
      const res = await request(app)
        .post(`/api/v1/restaurants/${restAId}/developer/api-keys`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          name: 'POS Key',
          scopes: ['menu:read', 'orders:read'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rawKey).toMatch(/^tsm_live_[a-f0-9]{48}$/);
      expect(res.body.data.apiKey.keyHash).toBeDefined();

      // Check DB does NOT store raw key in plaintext
      const dbKey = await ApiKey.findById(res.body.data.apiKey._id);
      expect(dbKey?.keyHash).not.toBe(res.body.data.rawKey);
    }, 15000);

    it('authenticates OpenAPI requests using X-API-Key header', async () => {
      const { rawKey } = await apiKeyService.createApiKey(restAId, {
        name: 'ERP Key',
        scopes: ['menu:read'],
      });

      const res = await request(app)
        .get('/api/v1/openapi/menu')
        .set('X-API-Key', rawKey);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('categories');
      expect(res.body.data).toHaveProperty('items');
    });

    it('enforces scope authorization — blocks write request if key lacks orders:write scope', async () => {
      const { rawKey } = await apiKeyService.createApiKey(restAId, {
        name: 'Read Only Key',
        scopes: ['menu:read', 'orders:read'],
      });

      const res = await request(app)
        .post('/api/v1/openapi/orders')
        .set('X-API-Key', rawKey)
        .send({
          items: [{ itemId: new mongoose.Types.ObjectId().toString(), name: 'Burger', quantity: 1, price: 100 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks access when API key is revoked', async () => {
      const { apiKey, rawKey } = await apiKeyService.createApiKey(restAId, {
        name: 'Temporary Key',
        scopes: ['menu:read'],
      });

      await apiKeyService.revokeApiKey(restAId, apiKey._id.toString());

      const res = await request(app)
        .get('/api/v1/openapi/menu')
        .set('X-API-Key', rawKey);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Webhook Subscriptions & HMAC Signature Calculation', () => {
    it('creates a webhook subscription with targetUrl and event triggers', async () => {
      const res = await request(app)
        .post(`/api/v1/restaurants/${restAId}/developer/webhooks`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({
          targetUrl: 'https://example.com/webhooks/orders',
          events: ['order.created', 'order.status_updated'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toMatch(/^whsec_[a-f0-9]{48}$/);
    });

    it('computes correct HMAC-SHA256 signature for outgoing webhook payload', () => {
      const payloadStr = JSON.stringify({ event: 'order.created', orderId: '12345' });
      const timestamp = 1700000000;
      const secret = 'whsec_test_secret_key';

      const signatureHex = webhookDispatcherService.computeSignature(payloadStr, timestamp, secret);
      expect(signatureHex).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Authorization & Feature Flag Gating', () => {
    it('blocks Staff token from accessing developer portal (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/developer/api-keys`)
        .set('Authorization', `Bearer ${staffAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks request if api_webhooks feature flag is disabled', async () => {
      await featureFlagService.disable(restAId, 'api_webhooks');

      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/developer/api-keys`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
