import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../src/index';
import { User } from '../../src/models/User';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';
import { DeviceToken } from '../../src/models/DeviceToken';
import { tokenService } from '../../src/services/token.service';
import bcrypt from 'bcrypt';

let mongoServer: MongoMemoryServer;

describe('Push Notifications & Differentiated Session Persistence Tests', () => {
  let user: any;
  let restaurant: any;
  let staffToken: string;

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    restaurant = await Restaurant.create({
      name: 'Test Floor Outlet',
      slug: 'test-floor-outlet',
      code: 'REST001',
      currency: 'INR',
      isActive: true,
    });

    const passwordHash = await bcrypt.hash('Password123!', 10);
    user = await User.create({
      name: 'Captain John',
      email: 'captain.john@example.com',
      passwordHash,
      role: 'STAFF',
      isActive: true,
    });

    await RestaurantStaff.create({
      userId: user._id,
      restaurantId: restaurant._id,
      role: 'STAFF',
      isActive: true,
    });

    staffToken = tokenService.generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  });

  afterEach(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('Session Persistence: Web vs Mobile Login', () => {
    it('should set 1-day cookie and refresh token expiry for web client logins', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'captain.john@example.com',
          password: 'Password123!',
          clientType: 'web',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies[0];
      // Max-Age should be around 86400 (1 day in seconds)
      expect(cookieStr).toContain('Max-Age=86400');
    });

    it('should set 365-day cookie and refresh token expiry for mobile captain app logins', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'captain.john@example.com',
          password: 'Password123!',
          clientType: 'mobile',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies[0];
      // Max-Age for 365 days = 31536000 seconds
      expect(cookieStr).toContain('Max-Age=31536000');
    });

    it('should extend 365-day session during mobile token refresh', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'captain.john@example.com',
          password: 'Password123!',
          clientType: 'mobile',
        });

      const refreshToken = loginRes.body.data.refreshToken;

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
          clientType: 'mobile',
        });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data.accessToken).toBeDefined();
      expect(refreshRes.body.data.refreshToken).toBeDefined();

      const cookies = refreshRes.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('Max-Age=31536000');
    });
  });

  describe('Device Push Token Management', () => {
    it('should register captain device token successfully', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/devices/register')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          token: 'fcm_test_device_token_xyz_12345',
          platform: 'android',
          restaurantId: restaurant._id.toString(),
          deviceModel: 'Pixel 7',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registered).toBe(true);

      const device = await DeviceToken.findOne({ token: 'fcm_test_device_token_xyz_12345' });
      expect(device).toBeDefined();
      expect(device?.userId.toString()).toBe(user._id.toString());
      expect(device?.restaurantId.toString()).toBe(restaurant._id.toString());
      expect(device?.platform).toBe('android');
      expect(device?.isActive).toBe(true);
    });

    it('should unregister device token on captain logout', async () => {
      await DeviceToken.create({
        userId: user._id,
        restaurantId: restaurant._id,
        token: 'fcm_active_token_to_unregister',
        platform: 'android',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/notifications/devices/unregister')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          token: 'fcm_active_token_to_unregister',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const device = await DeviceToken.findOne({ token: 'fcm_active_token_to_unregister' });
      expect(device?.isActive).toBe(false);
    });

    it('should send test push notification endpoint gracefully in fallback mode', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/test')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: '🛎️ Test Bell',
          body: 'Testing notification pipeline',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
