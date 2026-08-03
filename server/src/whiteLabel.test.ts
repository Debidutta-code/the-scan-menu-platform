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
import { featureFlagService } from './services/featureFlag.service';

const TEST_JWT_SECRET = 'test_access_secret_key_123_abc_456_def';

describe('Phase 14 White Label Capabilities Test Suite', () => {
  let restAId: string;
  let restBId: string;
  let managerAToken: string;
  let staffAToken: string;
  let managerBToken: string;

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

    // Create Restaurant A
    const restA = await Restaurant.create({
      code: 'RST-WL-A',
      name: 'Gourmet Bistro',
      slug: 'gourmet-bistro',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restAId = restA._id.toString();

    await RestaurantSettings.create({
      restaurantId: restA._id,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      whiteLabelConfig: {
        enabled: true,
        customDomain: 'menu.gourmetbistro.com',
        primaryColor: '#111827',
        hidePoweredBy: true,
      },
    });
    await featureFlagService.enable(restAId, 'white_label');

    // Create Restaurant B
    const restB = await Restaurant.create({
      code: 'RST-WL-B',
      name: 'Cafe Royale',
      slug: 'cafe-royale',
      status: 'ACTIVE',
      currency: 'INR',
    });
    restBId = restB._id.toString();

    await RestaurantSettings.create({
      restaurantId: restB._id,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      whiteLabelConfig: {
        enabled: true,
        customDomain: 'menu.caferoyale.com',
      },
    });
    await featureFlagService.enable(restBId, 'white_label');

    // Users & Tokens
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const mgrA = await User.create({
      name: 'Manager A',
      email: 'manager.a@whitelabel.com',
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
      email: 'staff.a@whitelabel.com',
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

    const mgrB = await User.create({
      name: 'Manager B',
      email: 'manager.b@whitelabel.com',
      passwordHash: hashedPassword,
      role: 'MANAGER',
    });
    await RestaurantStaff.create({
      restaurantId: restB._id,
      userId: mgrB._id,
      role: 'MANAGER',
      isActive: true,
    });
    managerBToken = generateAccessToken(mgrB);
  });

  describe('Configuration Management & Custom Domain Resolution', () => {
    it('GET /white-label returns current configuration for Manager token', async () => {
      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/white-label`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customDomain).toBe('menu.gourmetbistro.com');
      expect(res.body.data.hidePoweredBy).toBe(true);
    });

    it('PATCH /white-label updates branding, custom CSS, and hidePoweredBy flag', async () => {
      const payload = {
        primaryColor: '#0055FF',
        secondaryColor: '#F0F0F0',
        fontFamily: 'Outfit',
        hidePoweredBy: true,
        logoUrl: 'https://gourmetbistro.com/logo.png',
      };

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/white-label`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.primaryColor).toBe('#0055FF');
      expect(res.body.data.fontFamily).toBe('Outfit');
      expect(res.body.data.logoUrl).toBe('https://gourmetbistro.com/logo.png');
    });

    it('prevents custom domain registration if already taken by another restaurant', async () => {
      const payload = {
        customDomain: 'menu.gourmetbistro.com', // Already registered to Restaurant A
      };

      const res = await request(app)
        .patch(`/api/v1/restaurants/${restBId}/white-label`)
        .set('Authorization', `Bearer ${managerBToken}`)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CUSTOM_DOMAIN_TAKEN');
    });

    it('GET /api/v1/public/white-label/domain/:domain resolves tenant by custom domain', async () => {
      const res = await request(app).get('/api/v1/public/white-label/domain/menu.gourmetbistro.com');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.restaurant.name).toBe('Gourmet Bistro');
      expect(res.body.data.whiteLabel.hidePoweredBy).toBe(true);
    });

    it('returns 404 for unregistered domain', async () => {
      const res = await request(app).get('/api/v1/public/white-label/domain/unknown.domain.com');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOMAIN_NOT_FOUND');
    });
  });

  describe('Authorization & Feature Flag Gating', () => {
    it('blocks Staff token from updating white label settings (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/white-label`)
        .set('Authorization', `Bearer ${staffAToken}`)
        .send({ primaryColor: '#FF0000' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('enforces multi-tenant isolation — Manager B cannot modify Restaurant A settings', async () => {
      const res = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/white-label`)
        .set('Authorization', `Bearer ${managerBToken}`)
        .send({ primaryColor: '#FF0000' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks request if white_label feature flag is disabled', async () => {
      await featureFlagService.disable(restAId, 'white_label');

      const res = await request(app)
        .get(`/api/v1/restaurants/${restAId}/white-label`)
        .set('Authorization', `Bearer ${managerAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('validates primaryColor format and returns 400 for invalid hex', async () => {
      const res = await request(app)
        .patch(`/api/v1/restaurants/${restAId}/white-label`)
        .set('Authorization', `Bearer ${managerAToken}`)
        .send({ primaryColor: 'invalid-color' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CONFIG');
    });
  });
});
