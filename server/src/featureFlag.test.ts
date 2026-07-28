import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from './index';
import { Types } from 'mongoose';
import { FeatureFlag } from './models/FeatureFlag';
import { featureFlagService } from './services/featureFlag.service';
import { requireFeature } from './middleware/featureFlag';
import { Restaurant } from './models/Restaurant';
import { RestaurantStaff } from './models/RestaurantStaff';

import jwt from 'jsonwebtoken';
import { UserRepository } from './repositories/user.repository';
import { TokenService } from './services/token.service';
import { Server } from 'http';

describe('FeatureFlag Service & Middleware Tests', () => {
  const mockRestaurantId = new Types.ObjectId();
  const mockUserId = new Types.ObjectId();
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test_secret';

    vi.spyOn(TokenService.prototype, 'verifyAccessToken').mockImplementation((token: string) => jwt.verify(token, 'test_secret') as any);
    adminToken = jwt.sign(
      { id: mockUserId.toString(), role: 'SUPER_ADMIN', email: 'admin@test.com', isActive: true },
      'test_secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('FeatureFlagService', () => {
    it('should retrieve existing flags', async () => {
      const mockFlags = [{ key: 'qr_menu', enabled: true }];
      vi.spyOn(FeatureFlag, 'find').mockResolvedValueOnce(mockFlags as any);

      const flags = await featureFlagService.getRestaurantFlags(mockRestaurantId);
      expect(flags).toEqual(mockFlags);
      expect(FeatureFlag.find).toHaveBeenCalledWith({ restaurantId: mockRestaurantId });
    });

    it('should seed default flags if none exist', async () => {
      vi.spyOn(FeatureFlag, 'find')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ key: 'qr_menu', enabled: false }] as any);
      vi.spyOn(FeatureFlag, 'insertMany').mockResolvedValueOnce([] as any);

      const flags = await featureFlagService.getRestaurantFlags(mockRestaurantId);
      expect(FeatureFlag.insertMany).toHaveBeenCalled();
      expect(flags.length).toBeGreaterThan(0);
    });

    it('should check if a feature is enabled', async () => {
      vi.spyOn(FeatureFlag, 'findOne').mockResolvedValueOnce({ enabled: true } as any);
      const isEnabled = await featureFlagService.isEnabled(mockRestaurantId, 'qr_menu');
      expect(isEnabled).toBe(true);
    });

    it('should return false if a feature is not found', async () => {
      vi.spyOn(FeatureFlag, 'findOne').mockResolvedValueOnce(null);
      const isEnabled = await featureFlagService.isEnabled(mockRestaurantId, 'not_found');
      expect(isEnabled).toBe(false);
    });
  });

  describe('FeatureFlag Middleware', () => {
    it('should call next if feature is enabled', async () => {
      const req = { params: { restaurantId: mockRestaurantId.toString() } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      vi.spyOn(featureFlagService, 'isEnabled').mockResolvedValueOnce(true);

      const middleware = requireFeature('qr_menu');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 if feature is disabled', async () => {
      const req = { params: { restaurantId: mockRestaurantId.toString() } } as any;
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
      const next = vi.fn();

      vi.spyOn(featureFlagService, 'isEnabled').mockResolvedValueOnce(false);

      const middleware = requireFeature('qr_menu');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Feature 'qr_menu' is disabled for this restaurant.",
      });
    });
  });

  describe('FeatureFlag Controller (API)', () => {
    let server: Server;
    beforeEach(() => {
        // mock auth middleware
        vi.spyOn(UserRepository.prototype, 'findById').mockImplementation(async (id) => {
            if (id === mockUserId.toString()) {
                 return { id: mockUserId.toString(), email: 'test@test.com', role: 'SUPER_ADMIN', isActive: true } as any;
            }
            return null;
        });
        server = app.listen(0);
    });
    afterEach(() => {
        server.close();
    });
    it('should get all feature flags for a restaurant', async () => {
      const mockFlags = [{ key: 'qr_menu', enabled: true }];
      vi.spyOn(featureFlagService, 'getRestaurantFlags').mockResolvedValueOnce(mockFlags as any);
      vi.spyOn(Restaurant, 'findById').mockResolvedValueOnce({ _id: mockRestaurantId } as any);

      const res = await request(server)
        .get(`/api/v1/restaurants/${mockRestaurantId}/feature-flags`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockFlags);
    });

    it('should update feature flags for a restaurant', async () => {
      const mockFlags = [{ key: 'qr_menu', enabled: false }];
      vi.spyOn(featureFlagService, 'bulkUpdate').mockResolvedValueOnce(mockFlags as any);
      vi.spyOn(Restaurant, 'findById').mockResolvedValueOnce({ _id: mockRestaurantId } as any);

      const res = await request(server)
        .patch(`/api/v1/restaurants/${mockRestaurantId}/feature-flags`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ flags: [{ key: 'qr_menu', enabled: false }] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockFlags);
    });

    it('should block cross-tenant access for managers', async () => {
        const otherRestaurantId = new Types.ObjectId();
        const managerToken = jwt.sign(
            { id: mockUserId.toString(), role: 'MANAGER', email: 'manager@test.com', isActive: true },
            'test_secret',
            { expiresIn: '1h' }
        );

        // Mock User findById
        vi.spyOn(UserRepository.prototype, 'findById').mockImplementation(async (id) => {
            if (id === mockUserId.toString()) {
                 return { id: mockUserId.toString(), email: 'manager@test.com', role: 'MANAGER', isActive: true, restaurantId: mockRestaurantId } as any;
            }
            return null;
        });

        // Mock Restaurant findById
        vi.spyOn(Restaurant, 'findById').mockResolvedValueOnce({ _id: otherRestaurantId } as any);
        vi.spyOn(RestaurantStaff, 'findOne').mockResolvedValueOnce(null);

        const res = await request(server)
            .get(`/api/v1/restaurants/${otherRestaurantId}/feature-flags`)
            .set('Authorization', `Bearer ${managerToken}`);

        // Access denied because manager doesn't belong to otherRestaurantId
        expect(res.status).toBe(403);
    });
  });
});
