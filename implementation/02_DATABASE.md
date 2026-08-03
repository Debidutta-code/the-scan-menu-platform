# 02_DATABASE.md - Database Architecture & Schema Specification

This document details the MongoDB database architecture, indexing strategies, encryption, and Mongoose data models for **The Scan Menu**. Full detailed schema specifications are synchronized with [`docs/DATABASE.md`](../docs/DATABASE.md).

---

## Security & Credentials
- **Encryption**: App-wide AES-256-GCM encryption (via `ENCRYPTION_KEY`) stores sensitive tenant configuration secrets like `keySecret` and `webhookSecret` in `RestaurantSettings`.
- **JWT Refresh Tokens**: Refresh token strings are hashed (SHA-256) before database storage in `RefreshToken` with TTL expiration indexes.

---

## Core Models Overview (20 Collections)

### 1. Tenant & Authentication
- **User**: Multi-tenant platform user identity with role authorization (`SUPER_ADMIN`, `MANAGER`, `STAFF`).
- **RefreshToken**: Hashed refresh token store with TTL index for automated cleanup.
- **Restaurant**: Core multi-tenant restaurant entity identified by unique `slug` and `code`.
- **RestaurantSettings**: Per-tenant payment provider configurations, tax rates, workflow modes, and custom branding.
- **RestaurantStaff**: Tenant-user association mapping roles (`MANAGER`, `STAFF`) to restaurants.
- **SubscriptionPlan**: Tiered SaaS plan definition (`STARTER`, `PRO`, `ENTERPRISE`).
- **FeatureFlag**: Per-restaurant feature flag toggles (`ordering`, `payments`, `waiter_call`, etc.).

### 2. Dining Floor & Catalog
- **Table**: Physical table entity associated with an unguessable token and generated QR code.
- **TableZone**: Logical area grouping for tables (e.g. Patio, Main Hall, Bar).
- **Category**: Menu category grouping items with sort order.
- **MenuItem**: Catalog item with price in paise/cents, availability, diet badges, add-on options, and `externalIds` (e.g. `externalIds.petpooja`) for third-party POS item mapping.
- **Tax**: Individual tax definitions and compound tax group configurations.

### 3. Order Engine (Phase 8 Ordering Modes Expansion & Phase 10 POS Metadata)
- **TableSession**: Active dining session at a physical table accumulating multi-round orders for Dine-In.
- **Order**: Primary ordering ticket entity supporting four distinct modes (`DINE_IN`, `TAKEAWAY`, `DELIVERY`, `COUNTER`) and `integrationMetadata` storing external POS ticket IDs (`petpoojaOrderId`, sync timestamps, POS status).
  1. `DINE_IN`: Requires `tableId` & `sessionId`. Integrated with physical table QR scan.
  2. `TAKEAWAY`: Session-less. Requires `customerName` & `customerPhone`. Follows restaurant's `activeMode` (`PREPAID` or `POSTPAID`).
  3. `DELIVERY`: Session-less. Requires `customerName`, `customerPhone`, & `deliveryAddress`. Effectively prepaid by default when digital payment (Razorpay) is configured; marked as "Cash on Delivery" when on `CASH`.
  4. `COUNTER`: Authenticated staff-facing rapid order entry. Bypasses customer checkout and creates orders directly in an active state with `paymentStatus: 'PAID'`.
- **OrderCounter**: Atomic counter (`seq`) ensuring sequential `orderNumber` generation per restaurant.

### 4. Payments, Assistance & Integrations
- **Transaction**: Ledger for all payment attempts (`CASH`, `RAZORPAY`, `STRIPE`, `SQUARE`).
- **WaiterCall**: Table assistance requests (`CALL_WAITER`, `REQUEST_BILL`, `WATER`, `TISSUE`).
- **IntegrationSyncLog**: Audit log for external POS synchronization containing `restaurantId`, optional `orderId`, `provider`, `operation` (`SYNC_MENU` | `PUSH_ORDER` | `UPDATE_STATUS`), `status` (`PENDING` | `SUCCESS` | `FAILED`), `errorMessage`, and `payloadSnapshot`.
- **RestaurantOnboarding**: Multi-step onboarding progress tracker.
- **RestaurantStats**: Aggregate counters for reporting and analytics.

---

## Indexing Strategy
1. **Multi-tenant Isolation**: All tenant-scoped models feature an index on `restaurantId`.
2. **Order Queues**: `Order` features compound indexes:
   - `{ restaurantId: 1, orderNumber: 1 }` (Unique order sequence)
   - `{ restaurantId: 1, status: 1 }` (Kitchen active queue optimization)
   - `{ restaurantId: 1, createdAt: -1 }` (History pagination)
   - `{ restaurantId: 1, orderMode: 1, createdAt: -1 }` (Mode-filtered reporting)
3. **POS Integration Logs**: `IntegrationSyncLog` features compound indexes:
   - `{ restaurantId: 1, createdAt: -1 }` (Log audit history)
   - `{ restaurantId: 1, status: 1 }` (Failed sync monitoring)
   - `{ orderId: 1 }` (Order-specific sync lookups)

