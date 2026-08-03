# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - Phase 6

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

---

*(Historical entries omitted for brevity)*

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
