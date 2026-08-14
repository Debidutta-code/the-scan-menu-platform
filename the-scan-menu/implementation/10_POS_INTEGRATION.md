# POS Integration Architecture

A key selling point of TheScanMenu is its ability to integrate seamlessly with existing Point-Of-Sale (POS) systems (e.g., Petpooja, UrbanPiper, Square) so that QR orders appear directly in the restaurant's existing workflows.

---

## The Adapter Pattern

The integration layer (`server/src/integrations/`) is built using a strict Adapter pattern to decouple the core application logic from third-party vendor APIs.

### 1. `RestaurantIntegration` Interface
Defines the mandatory contract every POS integration must fulfill (`server/src/integrations/core/RestaurantIntegration.ts`):
- `syncMenu(restaurantId: string): Promise<any>`: Pull or push menu data between the POS and TheScanMenu. Tagging items with external POS IDs (`MenuItem.externalIds.petpooja`).
- `pushOrder(order: any): Promise<any>`: Send a new order (from any of the four ordering modes) into the POS as a ticket.
- `updateOrderStatus(orderId: string, status: string): Promise<any>`: Update order status in the POS.
- `syncOrder(orderId: string): Promise<any>`: Retrieve single order status from the POS.

### 2. `IntegrationFactory`
Acts as a resolver (`server/src/integrations/core/IntegrationFactory.ts`). When a service needs to communicate with a POS, it calls `IntegrationFactory.getAdapter(providerName)`. It resolves the appropriate adapter based on the restaurant's `integrationConfig.provider` setting:
- `PETPOOJA`: Resolves `PetpoojaIntegration`.
- `NONE` / default: Resolves `NoOpIntegration`.

```typescript
const adapter = IntegrationFactory.getAdapter(settings.paymentConfig.integrationConfig.provider);
await adapter.pushOrder(orderData);
```

### 3. Active Adapters (Phase 10)
- `NoOpIntegration`: Default working adapter for restaurants without a configured POS. Resolves all operations successfully without side-effects.
- `PetpoojaIntegration`: Concrete adapter mapping internal data structures to Petpooja POS API payloads. Decrypts AES-256-GCM encrypted credentials (`appKey`, `appSecret`, `accessToken`).
- Future Stubs (`FutureUrbanPiperIntegration`, `FutureRistaIntegration`): Retained for future phases.

---

## Asynchronous & Non-Blocking Pipeline (`PosIntegrationService`)

POS integrations are inherently unstable (network latency, third-party downtime). TheScanMenu architecture enforces that POS calls **must never block** or fail core customer or staff order operations.

### Implementation Strategy:
1. **Non-Blocking Dispatch**: All POS interactions are routed through `PosIntegrationService` (`server/src/services/posIntegration.service.ts`) using asynchronous non-blocking handlers (`pushOrderAsync`, `updateOrderStatusAsync`, `syncMenuAsync`). Order placement and status update HTTP responses return immediately without waiting on external API round-trips.
2. **Audit Logging**: Every sync attempt creates an `IntegrationSyncLog` record (`operation`: `PUSH_ORDER` | `UPDATE_STATUS` | `SYNC_MENU`, `status`: `PENDING`).
3. **Outcome Recording**: On resolution, `IntegrationSyncLog.status` is updated to `SUCCESS` or `FAILED` (with detailed `errorMessage`).
4. **Manager Monitoring**: Managers and Admins can view sync audit logs via `GET /api/v1/restaurants/:restaurantId/integrations/sync-logs` (guarded by the `pos_integration` feature flag).

---

## Credential Encryption & Write-Only Security

Sensitive credentials (`appKey`, `appSecret`, `accessToken`) are encrypted using the platform's AES-256-GCM utility (`server/src/utils/encryption.ts`) before saving to `RestaurantSettings.paymentConfig.integrationConfig.config`. Credentials are write-only and NEVER returned in plain text via API responses.

---

## Inbound Webhook Processing (`POST /api/v1/webhooks/petpooja`)

Incoming status updates from Petpooja POS terminals are received at `POST /api/v1/webhooks/petpooja`. The controller matches the ticket ID (`petpoojaOrderId`), maps the status code to `OrderStatus`, and updates the database without breaking the workflow state machine.

---

## Unverified Petpooja API Assumptions (Sandbox Validation Checklist)

> [!WARNING]
> Before deploying any live restaurant tenant to Petpooja integration, the following vendor API assumptions must be verified against an active Petpooja developer sandbox account:

1. **Authentication Payload Format**: The adapter assumes `app_key`, `app_secret`, `access_token`, and `restID` are transmitted in the JSON request body for REST endpoints (`save_order`, `update_order_status`, `get_menu`).
2. **Status Code Mapping**: The adapter maps: `1` (Placed/Accepted), `2` (In Kitchen/Preparing), `3` (Ready for Pickup), `4` (Dispatched/Served), `5` (Cancelled). Verify Petpooja's exact numerical enum codes.
3. **Webhook Callback Payload**: The webhook controller expects JSON containing `{ order_id | petpooja_order_id, status }`. Confirm if Petpooja uses raw header HMAC signature verification (e.g. `X-Petpooja-Signature`).
4. **Price Units**: Order total and item prices are formatted in standard currency units (e.g., `150.00` INR converted from 15000 paise/cents). Verify if Petpooja expects integer paise or decimal string representation.
