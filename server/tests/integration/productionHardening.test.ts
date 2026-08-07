import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/index';
import { cacheService } from '../../src/utils/cacheService';

describe('Phase 16 Production Hardening & Infrastructure Test Suite', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pixora-qr-test');
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('CacheService Utility', () => {
    it('sets, gets, and invalidates cached data by key and pattern', () => {
      cacheService.clear();

      cacheService.set('public_menu_bistro', { items: ['Pizza', 'Burger'] }, { ttlSeconds: 60 });
      const cached = cacheService.get<{ items: string[] }>('public_menu_bistro');
      expect(cached).toEqual({ items: ['Pizza', 'Burger'] });

      cacheService.invalidatePattern('public_menu');
      expect(cacheService.get('public_menu_bistro')).toBeNull();
    });

    it('returns null when cache entry is expired', async () => {
      cacheService.clear();
      cacheService.set('short_key', 'test_value', { ttlSeconds: -1 }); // Expired TTL

      expect(cacheService.get('short_key')).toBeNull();
    });
  });

  describe('Correlation ID Middleware', () => {
    it('attaches X-Correlation-ID header to response', async () => {
      const res = await request(app).get('/health/liveness');

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(typeof res.headers['x-correlation-id']).toBe('string');
    });

    it('preserves existing X-Correlation-ID header if sent by client', async () => {
      const customCorrelationId = 'custom-correlation-id-12345';
      const res = await request(app)
        .get('/health/liveness')
        .set('X-Correlation-ID', customCorrelationId);

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(customCorrelationId);
    });
  });

  describe('Health Probes (/health)', () => {
    it('GET /health/liveness returns process live status (HTTP 200)', async () => {
      const res = await request(app).get('/health/liveness');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
    });

    it('GET /health/readiness returns deep database connectivity state (HTTP 200)', async () => {
      const res = await request(app).get('/health/readiness');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('READY');
      expect(res.body.data.database.connected).toBe(true);
      expect(res.body.data.memory).toHaveProperty('rssMB');
    });
  });
});
