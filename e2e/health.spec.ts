/**
 * health.spec.ts
 * Tests the /health/liveness and /health/readiness probes directly
 * via API request context — no browser UI needed.
 *
 * Response shapes from health.controller.ts:
 *  Liveness:  { success, data: { status: 'UP', timestamp }, message }
 *  Readiness: { success, data: { status: 'READY'|'DEGRADED', timestamp,
 *               uptimeSeconds, database: { connected, readyState },
 *               memory: { rssMB, heapUsedMB, heapTotalMB } }, message }
 */

import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:5000';

test.describe('Health Probes', () => {
  test('GET /health/liveness returns 200 with status UP', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/liveness`);

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    // Controller returns 'UP' (uppercase)
    expect(body.data.status).toBe('UP');
    expect(body.data).toHaveProperty('timestamp');
  });

  test('GET /health/readiness returns 200 with db READY', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/readiness`);

    // DB should be connected in dev — expect 200
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    // Controller returns 'READY' (uppercase)
    expect(body.data.status).toBe('READY');

    // Database sub-object (not a top-level `db` field)
    expect(body.data.database).toBeDefined();
    expect(body.data.database.connected).toBe(true);

    // Memory sub-object
    expect(body.data.memory).toBeDefined();
    expect(typeof body.data.memory.heapUsedMB).toBe('number');
    expect(typeof body.data.memory.rssMB).toBe('number');

    // Uptime at top level
    expect(typeof body.data.uptimeSeconds).toBe('number');
    expect(body.data.uptimeSeconds).toBeGreaterThan(0);
  });

  test('GET /health/readiness response satisfies standard envelope', async ({ request }) => {
    const res = await request.get(`${API_BASE}/health/readiness`);
    const body = await res.json();

    // Standard API envelope: success + data + message
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('message');
  });
});
