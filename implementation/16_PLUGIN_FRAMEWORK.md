# 16_PLUGIN_FRAMEWORK.md - Public API & Webhooks Specification

## Overview
Phase 15 introduces a production-grade **Plugin Framework** for third-party developers, POS systems, and ERP integrations on **The Scan Menu**. The framework provides secure, scope-restricted API keys (`X-API-Key`) with SHA-256 key hashing, an open REST API namespace (`/api/v1/openapi`), and outgoing webhook event subscriptions signed with HMAC-SHA256 headers (`X-TSM-Signature`).

---

## Technical Architecture

```
                          +------------------------------------+
                          |     Manager Developer Portal       |
                          |       (/manager/developer UI)      |
                          +------------------------------------+
                                            |
                                            v
                         POST /api/v1/restaurants/:id/developer/api-keys
                                            |
                                            v
                         +-------------------------------------+
                         |               ApiKey                |
                         |   keyHash: SHA-256(tsm_live_...)    |
                         +-------------------------------------+
                                            |
       +------------------------------------+------------------------------------+
       |                                                                         |
       v                                                                         v
Incoming API Request                                                   Outgoing Event Dispatch
GET /api/v1/openapi/menu                                               WebhookDispatcherService
Header: X-API-Key: tsm_live_...                                       Header: X-TSM-Signature: t=1700000,v1=hmac_hex
requireApiKey Middleware                                               Payload: { event: "order.created", ... }
```

---

## Data Schemas

### 1. `ApiKey` Collection
```ts
export interface IApiKey {
  restaurantId: Types.ObjectId;
  name: string;             // e.g., "ERP System Key"
  keyPrefix: string;        // Masked prefix (e.g. "tsm_live_a1b2c3d4...")
  keyHash: string;          // SHA-256 hash of raw API key
  scopes: ApiKeyScope[];    // ['menu:read', 'orders:read', 'orders:write', 'webhooks:manage']
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
}
```

### 2. `WebhookSubscription` Collection
```ts
export interface IWebhookSubscription {
  restaurantId: Types.ObjectId;
  targetUrl: string;        // HTTPS target URL
  events: WebhookEventType[]; // ['order.created', 'order.status_updated', 'inventory.low_stock', 'table_session.closed']
  secret: string;           // HMAC secret ("whsec_...")
  isActive: boolean;
  failureCount: number;     // Deactivated automatically if failureCount >= 10
  deliveryLogs: IWebhookDeliveryLog[];
}
```

---

## Security & Cryptography Discipline
1. **API Key Storage**: Raw API keys (`tsm_live_<32_random_bytes_hex>`) are returned **ONLY ONCE** upon generation. The backend stores only the SHA-256 hash (`crypto.createHash('sha256').update(rawKey).digest('hex')`).
2. **HMAC Webhook Signatures**: Outgoing HTTP POST webhooks compute an HMAC-SHA256 signature over `${timestamp}.${payloadStr}` using the webhook's HMAC secret (`whsec_...`).
   - Header: `X-TSM-Signature: t=1700000000,v1=a1b2c3d4e5f6...`
3. **Scope Enforcement**: Every endpoint in `/api/v1/openapi` requires specific scopes (`menu:read`, `orders:read`, `orders:write`, `webhooks:manage`).
4. **Feature Flag Gating**: Developer dashboard and API key endpoints are strictly guarded by `requireFeature('api_webhooks')`.
