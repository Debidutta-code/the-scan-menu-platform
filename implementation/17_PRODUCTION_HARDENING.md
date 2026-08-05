# 17_PRODUCTION_HARDENING.md - Production Hardening & Infrastructure Specification

## Overview
Phase 16 hardens **The Scan Menu** platform for production resilience with an in-memory caching layer, tiered rate-limiting, request correlation ID tracing, production liveness & readiness health probes, and graceful process shutdown handling. No external Redis dependency is introduced — the caching layer uses a process-local in-memory store with a straightforward fallback pattern, making this immediately deployable without additional infrastructure provisioning.

---

## Components

### 1. CacheService (`server/src/utils/cacheService.ts`)
- Singleton in-memory TTL cache.
- `cacheService.set(key, value, { ttlSeconds })` — stores with expiry.
- `cacheService.get(key)` — returns typed value or `null` on miss/expiry.
- `cacheService.invalidatePattern(pattern)` — bulk-removes keys containing `pattern` substring.
- **Public menu responses** are cached for 120 seconds keyed as `public_menu_{restaurantId}`.
- **Cache invalidated** on every write mutation in `menu.controller.ts` (create/edit/delete category/item, reorder, toggle availability, update stock).

### 2. Rate Limiting (`server/src/middleware/rateLimiter.middleware.ts`)
| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|-----------|
| `authRateLimiter` | 15 min | 10 | `POST /api/v1/auth/login` |
| `orderPlacementRateLimiter` | 1 min | 30 | Public order creation routes |
| `generalApiRateLimiter` | 15 min | 300 | All `/api/v1` routes (optional global) |

- Returns standard JSON envelope `{ success: false, error: { code: 'TOO_MANY_REQUESTS', ... } }` on HTTP 429.
- Respects `X-Forwarded-For` behind reverse proxy (`app.set('trust proxy', 1)`).

### 3. Request Correlation ID (`server/src/middleware/correlationId.middleware.ts`)
- Attached to all incoming HTTP requests.
- Uses `crypto.randomUUID()` (Node.js native, no external deps).
- Preserves existing `X-Correlation-ID` header if sent by upstream client/proxy.
- Header present in all API responses for log correlation.

### 4. Health Probes (`server/src/controllers/health.controller.ts`)
- `GET /health/liveness` → fast process liveness (HTTP 200 always while process is up).
- `GET /health/readiness` → deep readiness: verifies Mongoose `connection.readyState === 1`, reports `rssMB`, `heapUsedMB`, `heapTotalMB`, and `uptimeSeconds`. Returns HTTP 503 if DB is disconnected.

### 5. Graceful Shutdown (`server/src/utils/gracefulShutdown.ts`)
- Handles `SIGTERM` and `SIGINT` signals.
- Stops accepting new connections, waits for active request drain via `server.close()`.
- Closes Mongoose connection gracefully.
- Force-exits after 10-second timeout to prevent indefinite hang.
