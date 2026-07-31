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

## [Unreleased]
### Added
- Phase 7: Razorpay Adapter Implementation
- New Security Convention: Introduced `ENCRYPTION_KEY` app-wide symmetric AES-256-GCM encryption for storing third-party secrets (e.g. Razorpay `keySecret`, `webhookSecret`) inside `RestaurantSettings`.
- Razorpay Webhook endpoint (`POST /api/v1/webhooks/razorpay`) with idempotency and DoS protection (300 req/min + auto-ban for consecutive invalid signatures).
- Razorpay Checkout UI integrated into public menu order placement (`PublicTable.tsx`).
