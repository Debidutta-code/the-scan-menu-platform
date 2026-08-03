## [Phase 12] - Inventory Management

### Added
- Added `isAvailable`, `trackStock`, `stockQuantity`, and `lowStockThreshold` fields to `MenuItem` model with compound index `{ restaurantId: 1, isAvailable: 1, trackStock: 1 }`.
- Added `inventoryConfig` (`enableLowStockAlerts`, `defaultLowStockThreshold`, `auto86OnZeroStock`) to `RestaurantSettings` model.
- Created `InventoryLog` database collection for audit logging all availability toggles, manual stock adjustments, order decrements, and system auto-86s with actor metadata (`MANAGER`, `STAFF`, `ORDER`, `SYSTEM`).
- Created `InventoryService` (`server/src/services/inventory.service.ts`) providing `toggleItemAvailability`, `updateItemStock`, and `validateAndDecrementStock` with concurrency-safe atomic Mongo `$inc` decrements.
- Added `notifyInventoryUpdated` Socket.io broadcast method to `NotificationService`.
- Added REST endpoints: `PATCH /api/v1/restaurants/:restaurantId/menu-items/:itemId/availability` (Manager & Staff) and `PATCH /api/v1/restaurants/:restaurantId/menu-items/:itemId/stock` (Manager only).
- Hooked `validateAndDecrementStock` into all 4 ordering modes (`createOrder` for Dine-In, `createPublicOrder` for Takeaway/Delivery, and `createCounterOrder` for Counter POS) returning HTTP 400 `ITEMS_UNAVAILABLE` payload on rejection.
- Updated `ManagerMenu.tsx` with stock tracking form controls, stock count badges, low stock warning badges, and 86'd status badges.
- Updated `PublicTable.tsx` and `restaurant.service.ts` to reflect real-time 86'd status and stock updates via WebSockets.
- Created `13_INVENTORY.md` specification document detailing inventory architecture, atomic concurrency patterns, auto-86 behavior, and Petpooja non-blocking POS gap documentation.
- Comprehensive Vitest test suite in `server/src/inventory.test.ts` covering availability toggling, role authorization, stock depletion, auto-86 on zero stock, order rejections across all 4 modes, 5-request parallel concurrency race condition protection, tenant isolation, and KDS non-re-decrement regression integrity.

---

## [Phase 11] - Kitchen Display System (KDS)

### Added
- Generic `PaymentProvider` interface and `PaymentProviderFactory`.
- `CashAdapter` implementation, defaulting to manual ledger capture.
- `Transaction` database model for provider-agnostic ledger recording.
- Payment intents creation API, transaction listing API, and configuration API.
- Idempotent script `migratePhase6.ts` and NPM task `migrate:payments` to backfill defaults (`CASH`/`POSTPAID`).
- "Payments" UI section inside `ManagerSettings.tsx` to configure active mode and gateway, gated by "Upgrade Required".
- Dedicated `ManagerTransactions.tsx` dashboard for viewing the payment ledger (with status filtering and pagination).

### Changed
- Extended `RestaurantSettings.paymentConfig` to include `activeProvider` and `activeMode`.
- Fixed a top-level routing issue where `menuRoutes`'s global `requireRole('MANAGER')` was terminating downstream `staff` requests for unrelated controllers, by hoisting `paymentRoutes` above it in the `index.ts` routing stack.

## [Phase 11] - Kitchen Display System (KDS)

### Added
- Created `KDSController` (`server/src/controllers/kds.controller.ts`) handling active tickets retrieval, item status advancement, and full ticket bumping.
- Mounted KDS REST endpoints in `server/src/routes/restaurant.routes.ts`: `GET /:restaurantId/kds/tickets`, `PATCH /:restaurantId/kds/tickets/:orderId/items/:itemIndex/status`, `POST /:restaurantId/kds/tickets/:orderId/bump` (accessible by STAFF, MANAGER, SUPER_ADMIN, guarded by `kds` feature flag).
- Implemented touch- and tablet-optimized `ManagerKDS.tsx` page (`/manager/kds`) featuring real-time Socket.io tickets ingestion, one-tap item status progression (`Start Prep` ➔ `Mark Ready` ➔ `Serve Item`), station/category filters, order mode pills, elapsed aging timers (Green < 5m, Amber 5-15m, Red > 15m), and visual offline fallback state.
- Integrated KDS item status advancement with `getOrderStatusRollup` and Phase 10 Petpooja POS relay (`posIntegrationService.updateOrderStatusAsync`).
- Hoisted `restaurantRoutes` above `menuRoutes` in `server/src/index.ts` to prevent router-level `requireRole('MANAGER')` middleware from blocking `STAFF` requests to KDS endpoints.
- Created `12_KDS.md` specification document detailing KDS architecture, state machine, socket contracts, and UI guidelines.
- Comprehensive Vitest test suite in `server/src/kds.test.ts` covering ticket queries, forward status transitions, invalid backward rejection, Petpooja POS relay integration, socket room security, feature flag gating, and tenant isolation.

---

## [Phase 10] - Petpooja POS Integration

### Added
- Concrete `PetpoojaIntegration` adapter implementing `RestaurantIntegration` interface (`syncMenu`, `pushOrder`, `updateOrderStatus`, `syncOrder`).
- Updated `IntegrationFactory` to resolve `PetpoojaIntegration` for `PETPOOJA` provider while maintaining default `NoOpIntegration` for `NONE`.
- Extended `MenuItem` schema with `externalIds` field (e.g. `externalIds.petpooja`) for third-party item mapping.
- Added encrypted Petpooja configuration endpoint `PATCH /api/v1/restaurants/:restaurantId/integrations/petpooja/config` using AES-256-GCM encryption with write-only response discipline.
- Added manual menu sync endpoint `POST /api/v1/restaurants/:restaurantId/integrations/petpooja/sync-menu`.
- Added inbound webhook endpoint `POST /api/v1/webhooks/petpooja` for receiving status updates from Petpooja POS terminals.
- Added Petpooja POS configuration card and manual menu sync controls in `ManagerSettings.tsx`.
- Added real-time POS Sync status indicators (`[Synced]`, `[Sync Failed]`) on staff order cards in `ManagerOrders.tsx`.
- Created idempotent migration script `migratePhase10.ts` (`npm run migrate:phase10`).
- Comprehensive unit, integration, webhook, and zero-regression test suite in `petpoojaIntegration.test.ts`.

---

## [Phase 8] - Ordering Modes Expansion

### Added
- Decoupled `Order` model from mandatory `tableId`/`sessionId` and added explicit required `orderMode` enum field (`'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER'`).
- Added optional `deliveryAddress` field to `Order` for Delivery orders.
- Created idempotent migration script `server/src/utils/migratePhase8.ts` (`npm run migrate:phase8`) to backfill `orderMode: 'DINE_IN'` on legacy orders.
- Added sessionless customer order creation endpoint (`POST /public/restaurants/:restaurantSlug/orders`) for Takeaway & Delivery modes with name, phone, and address validation.
- Added public payment intent creation endpoints (`POST /public/restaurants/:restaurantSlug/payments/intent` and `POST /public/restaurants/:restaurantSlug/tables/:tableToken/payments/intent`).
- Added staff-facing rapid Counter POS endpoint (`POST /restaurants/:restaurantId/orders/counter`).
- Updated `listActiveOrders` with mode-aware prepaid gating: Delivery orders with digital payment pending are hidden until paid; Counter orders are created directly in active/paid status.
- Created `PublicSessionlessOrder.tsx` customer view for generic URL `/r/:restaurantSlug/order`.
- Created `ManagerCounter.tsx` staff POS view for `/manager/counter`.

---

## [Phase 7] - Razorpay Adapter Implementation
### Added
- New Security Convention: Introduced `ENCRYPTION_KEY` app-wide symmetric AES-256-GCM encryption for storing third-party secrets (e.g. Razorpay `keySecret`, `webhookSecret`) inside `RestaurantSettings`.
- Razorpay Webhook endpoint (`POST /api/v1/webhooks/razorpay`) with idempotency and DoS protection (300 req/min + auto-ban for consecutive invalid signatures).
- Razorpay Checkout UI integrated into public menu order placement (`PublicTable.tsx`).
