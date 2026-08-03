# POS Integration Architecture

A key selling point of TheScanMenu is its ability to integrate seamlessly with existing Point-Of-Sale (POS) systems (e.g., Petpooja, UrbanPiper, Square) so that QR orders appear directly in the restaurant's existing workflows.

---

## The Adapter Pattern

The integration layer (`server/src/integrations/`) is built using a strict Adapter pattern to decouple the core application logic from third-party vendor APIs.

### 1. `RestaurantIntegration` Interface
Defines the mandatory contract every POS integration must fulfill (`server/src/integrations/core/RestaurantIntegration.ts`):
- `syncMenu(restaurantId: string): Promise<any>`: Pull or push menu data between the POS and TheScanMenu.
- `pushOrder(order: any): Promise<any>`: Send a new order (from any of the four ordering modes) into the POS.
- `updateOrderStatus(orderId: string, status: string): Promise<any>`: Update order status in the POS.

### 2. `IntegrationFactory`
Acts as a resolver (`server/src/integrations/core/IntegrationFactory.ts`). When a service needs to communicate with a POS, it calls `IntegrationFactory.getAdapter(providerName)`. It resolves the appropriate adapter based on the restaurant's `integrationConfig.provider` setting, defaulting to `NoOpIntegration` for `NONE` or unrecognized providers.

```typescript
const adapter = IntegrationFactory.getAdapter(settings.paymentConfig.integrationConfig.provider);
await adapter.pushOrder(orderData);
```

### 3. Adapters
- `NoOpIntegration`: Default working adapter for restaurants without a configured POS. Resolves all operations successfully without side-effects.
- Future Stubs (`FuturePetpoojaIntegration`, `FutureUrbanPiperIntegration`, `FutureRistaIntegration`): Throw `NotImplementedError` when invoked until implemented in Phase 10+.

---

## Asynchronous & Non-Blocking Pipeline (`PosIntegrationService`)

POS integrations are inherently unstable (network latency, third-party downtime). TheScanMenu architecture enforces that POS calls **must never block** or fail core customer or staff order operations.

### Implementation Strategy:
1. **Non-Blocking Dispatch**: All POS interactions are routed through `PosIntegrationService` (`server/src/services/posIntegration.service.ts`) using asynchronous non-blocking handlers (`pushOrderAsync`, `updateOrderStatusAsync`, `syncMenuAsync`). Order placement and status update HTTP responses return immediately without waiting on external API round-trips.
2. **Audit Logging**: Every sync attempt creates an `IntegrationSyncLog` record (`operation`: `PUSH_ORDER` | `UPDATE_STATUS` | `SYNC_MENU`, `status`: `PENDING`).
3. **Outcome Recording**: On resolution, `IntegrationSyncLog.status` is updated to `SUCCESS` or `FAILED` (with detailed `errorMessage`).
4. **Manager Monitoring**: Managers and Admins can view sync audit logs via `GET /api/v1/restaurants/:restaurantId/integrations/sync-logs` (guarded by the `pos_integration` feature flag).
