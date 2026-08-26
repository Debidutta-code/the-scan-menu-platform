import { describe, it, expect, vi, beforeEach} from 'vitest';
import express from 'express';
import request from 'supertest';
import orderRoutes from '../../src/routes/order.routes';
import { Order } from '../../src/models/Order';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import mongoose from 'mongoose';

// Mock auth middleware to bypass authentication for tests
vi.mock('../../src/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'user123', role: 'STAFF', restaurantId: req.params.restaurantId };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
  requireRestaurantAccess: (req: any, res: any, next: any) => next(),
}));

vi.mock('../../src/middleware/featureFlag', () => ({
  requireFeature: () => (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
// The route expects /api/v1/ and then the internal routing is inside `orderRoutes`
// which expects `/:restaurantId/...` directly.
app.use('/api/v1', orderRoutes);

describe('GET /active - Active Orders Query Regression Test', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should list all pending non-prepaid (Cash/Postpaid) orders (Phase 6 regression test)', async () => {
    const restaurantId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      paymentConfig: { activeMode: 'POSTPAID' }
    } as any);

    vi.spyOn(Order, 'find').mockImplementation(() => {
      return {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([
          { _id: 'order1', status: 'PENDING', paymentStatus: 'PENDING', mode: 'POSTPAID' },
          { _id: 'order2', status: 'ACCEPTED', paymentStatus: 'PENDING', mode: 'POSTPAID' }
        ])
      } as any;
    });

    const response = await request(app).get(`/api/v1/${restaurantId}/orders/active`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(2);
    expect(Order.find).toHaveBeenCalledWith(expect.objectContaining({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      status: { $ne: 'CANCELLED' },
      isCleared: { $ne: true },
    }));
  });

  it('should list active orders including pending payment orders when restaurant is in PREPAID mode', async () => {
    const restaurantId = new mongoose.Types.ObjectId().toString();

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      paymentConfig: { activeMode: 'PREPAID' }
    } as any);

    vi.spyOn(Order, 'find').mockImplementation(() => {
      return {
        sort: vi.fn().mockReturnThis(),
        populate: vi.fn().mockResolvedValue([
          { _id: 'order1', status: 'PENDING', paymentStatus: 'PENDING' },
          { _id: 'order2', status: 'PREPARING', paymentStatus: 'PAID' }
        ])
      } as any;
    });

    const response = await request(app).get(`/api/v1/${restaurantId}/orders/active`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(2);
    expect(Order.find).toHaveBeenCalledWith(expect.objectContaining({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      status: { $ne: 'CANCELLED' },
      isCleared: { $ne: true },
    }));
  });
});
