# 14_ANALYTICS.md - Analytics & Reporting Specification

This document defines the technical architecture, aggregation pipelines, authorization controls, and reporting scope for **The Scan Menu** Analytics & Reporting system (Phase 13).

---

## 1. Overview & Architecture

The Analytics module provides operational business intelligence for restaurant managers and staff. It processes time-series transactional data to calculate revenue metrics, order volume patterns, menu item sales rankings, and peak hour trends.

### Core Design Rules
1. **Read-Only Aggregation Layer**: The analytics service is strictly read-only with respect to `Order`, `Payment`, `MenuItem`, and `RestaurantSettings` models. No report calculation path mutates operational state.
2. **On-Demand Index-Covered Aggregations**: Queries run on-demand directly against MongoDB using indexed fields (`{ restaurantId: 1, createdAt: -1 }`, `{ restaurantId: 1, orderMode: 1, createdAt: -1 }`, `{ restaurantId: 1, status: 1 }`). No pre-aggregated rollup collection or cron background worker is required, avoiding stale cache pitfalls.
3. **Multi-Tenant Scoping**: All aggregation pipelines strictly enforce `restaurantId` matching in their primary `$match` stages.

---

## 2. Calculation Rules & Data Integrity

### Revenue & Paid Order Count
- **Formula**: Net Revenue = sum of `Order.total` where `status != 'CANCELLED'` and `paymentStatus == 'PAID'`.
- **Exclusions**: Cancelled orders (`status: 'CANCELLED'`), unpaid orders (`paymentStatus: 'PENDING'`), and failed payment transactions are strictly excluded from revenue calculations.
- **Average Order Value (AOV)**: `Net Revenue / Net Paid Order Count` (rounded to nearest integer).

### Petpooja & POS Order Deduplication
- Orders relayed to/from Petpooja POS update the existing `Order` document (`integrationMetadata.petpoojaOrderId`). No duplicate rows exist in the database.
- Aggregation pipelines count each POS-originated or QR-originated order **exactly once**.
- Metrics can be filtered and broken down by `orderMode` (`DINE_IN`, `TAKEAWAY`, `DELIVERY`, `COUNTER`) and `source` (`QR`, `POS`, `API`, `MANUAL`).

### Best-Selling Menu Items & Availability Badges
- Top items are aggregated from `Order.items` snapshots (`menuItemId`, `nameSnapshot`, `unitPriceSnapshot`, `quantity`).
- Pipeline joins `$lookup` with the `MenuItem` collection to return current `isAvailable` and `isArchived` flags.
- Manager UI renders status badges (`86'd / Unavailable`, `Archived`) alongside historical top items to prevent silent ambiguity when an item is currently disabled.

### Peak Hours & Timezone Handling
- Hourly (0..23) and daily (1..7) volume distributions use MongoDB `$hour` and `$dayOfWeek` operators parameterized with the tenant's configured `timezone` from `RestaurantSettings` (default `'Asia/Kolkata'`).
- Prevents UTC offset skew for late-night restaurant operational hours.

---

## 3. Service Layer Architecture

- **Service Class**: `AnalyticsService` (`server/src/services/analytics.service.ts`)
- **Controller Class**: `AnalyticsController` (`server/src/controllers/analytics.controller.ts`)
- **Validator**: Zod schema `analyticsQuerySchema` (`server/src/validators/analytics.validator.ts`)
- **Router**: `analytics.routes.ts` mounted at `/api/v1/restaurants/:restaurantId/analytics`.

---

## 4. API Specification

| Endpoint | Method | Roles Allowed | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/restaurants/:restaurantId/analytics/summary` | GET | `MANAGER`, `STAFF`, `SUPER_ADMIN` | Returns revenue, order counts, AOV, mode/source breakdowns. |
| `/api/v1/restaurants/:restaurantId/analytics/top-items` | GET | `MANAGER`, `STAFF`, `SUPER_ADMIN` | Returns best-selling items with availability status badges. |
| `/api/v1/restaurants/:restaurantId/analytics/peak-hours` | GET | `MANAGER`, `STAFF`, `SUPER_ADMIN` | Returns hourly/daily volume distribution in restaurant timezone. |
| `/api/v1/restaurants/:restaurantId/analytics` | GET | `MANAGER`, `STAFF`, `SUPER_ADMIN` | Returns composite overview payload for Manager Dashboard UI. |

---

## 5. Security & Feature Flag Gating

- **Feature Flag**: Guarded by `requireFeature('analytics')`.
- **Tenant Guard**: Guarded by `requireRestaurantAccess`.
- **Role Guard**: Guarded by `requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN')`.
