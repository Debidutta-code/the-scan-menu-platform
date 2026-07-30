# Changelog

## Purpose
This document tracks the evolution of TheScanMenu platform. It serves as a living, append-only historical record of all significant changes to the system.

## Versioning Strategy
We adhere to [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):
*   **MAJOR**: Incompatible API changes, massive architectural shifts, or complete UI overhauls.
*   **MINOR**: New features, modules, or database schema additions that are backward compatible.
*   **PATCH**: Bug fixes, performance improvements, and documentation updates.

---

## Release History

### Version 0.5.0 - Phase 4 Complete (Restaurant Provisioning & Multi-Tenant Foundation)
*Date: 2026-07-30*

**Summary:**
Implemented the complete Restaurant Provisioning architecture, transforming restaurant creation into an atomic transaction workflow. Decoupled configuration and statistics into `RestaurantSettings`, `RestaurantStats`, and `RestaurantOnboarding` models. Added atomic sequential restaurant code generation via `Counter` (`RST-XXXXXX`) and updated `Restaurant` to use status (`TRIAL`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `ARCHIVED`).

**Added:**
- `Counter` model and `CounterService` for atomic, zero-collision sequential restaurant code generation (`RST-000001`, `RST-000002`).
- `RestaurantSettings` model holding theme, branding, currency, timezone, workflow, payment configuration, notification preferences, order configuration, and UI settings.
- `RestaurantStats` model holding cached metrics (`menuItemsCount`, `tablesCount`, `staffCount`, `ordersCount`, `activeOrders`, `completedOrders`, `cancelledOrders`, `revenue`, `todayRevenue`, `todayOrders`).
- `RestaurantOnboarding` model tracking milestone progress.
- `RestaurantProvisioningService` executing all 10 creation steps inside a single MongoDB transaction (`session.startTransaction()`).
- `RestaurantStatsService` for explicit statistics tracking without Mongoose hooks.
- Admin APIs: `POST /api/v1/admin/restaurants/provision` and `GET /api/v1/admin/restaurants/:id/onboarding`.
- Idempotent Phase 4 migration script (`migratePhase4.ts`).

**Refactored:**
- `Restaurant` schema: added required unique `code` and `status` enum (`TRIAL`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `ARCHIVED`). Removed legacy `isActive` field and configuration properties.
- `public.controller.ts`, `restaurant.controller.ts`, `menu.controller.ts`, `order.controller.ts`, `admin.controller.ts` updated to fetch configuration from `RestaurantSettings` and update `RestaurantStatsService`.

**Tests:**
- Created `provisioning.test.ts` covering transaction success, transaction rollback, counter generation, uniqueness, settings, stats, onboarding, and admin endpoints.

### Version 0.4.0 - Subscription Plan System
*Date: Today*

**Summary:**
Implemented the Subscription Plan System tying commercial tiers to the Feature Flag engine.

**Added:**
- `SubscriptionPlan` model with `FREE`, `STARTER`, `PROFESSIONAL`, and `ENTERPRISE` tiers.
- Automated synchronization between a restaurant plan and their enabled feature flags.
- `UpgradeRequired` React component for robust UI handling of plan-gated features and manual administrative overrides.
- Manager settings UI extension allowing Super Admins to manage tenant subscriptions.


### Version 0.1.0 - Documentation Foundation
*Date: Initial Audit Phase*

**Summary:**
This release establishes the core architectural blueprint and commercial vision for the platform. It transitions the project from a simple QR ordering prototype into a well-documented, enterprise-ready Restaurant Operating System (SaaS). No application code was altered; the focus was entirely on establishing strict development guardrails.

**Documentation Updates:**
*   Created `/implementation` directory.
*   Documented system flows (`00_PROJECT_AUDIT.md`, `21_USER_FLOWS.md`).
*   Defined current technical architecture (`01_ARCHITECTURE.md`, `02_DATABASE.md`, `03_FRONTEND.md`, `04_BACKEND.md`).
*   Documented API and Security standards (`05_API.md`, `06_AUTHORIZATION.md`, `11_SECURITY.md`).
*   Established multi-tenant, white-label, and feature-flag strategies (`07_MULTI_TENANT.md`, `08_FEATURE_FLAGS.md`).
*   Defined the Payment and POS integration adapter patterns (`09_PAYMENT_ARCHITECTURE.md`, `10_POS_INTEGRATION.md`).
*   Identified current tech debt and performance baselines (`12_PERFORMANCE.md`, `13_TECH_DEBT.md`).
*   Created a strict 16-Phase commercial implementation roadmap (`15_IMPLEMENTATION_PLAN.md`).
*   Defined the core Product Specification and Subscription/Module Matrices (`19_PRODUCT_SPEC.md`, `20_MODULE_MATRIX.md`).
*   Established rigid AI Context and Repository Rules (`17_AI_CONTEXT.md`, `18_REPOSITORY_RULES.md`, `25_IMPLEMENTATION_RULES.md`).

**Architecture Changes:**
*   *Planned:* Transition from single-purpose QR tool to modular Restaurant OS.

**Database Changes:**
*   *Planned:* Future inclusion of `FeatureFlag`, `SubscriptionPlan`, `Station`, `Inventory`, and `Webhook` collections.

**API Changes:**
*   *None.*

**Feature Changes:**
*   *None.*

**Breaking Changes:**
*   *None.*

**Migration Notes:**
*   *None.*

**Known Issues:**
*   Missing comprehensive End-to-End (E2E) testing suite.
*   Socket.IO is currently bound to single-node memory; requires Redis adapter before horizontal scaling.

**Future Release Planning:**
*   The immediate next phase (v0.2.0) will focus on Repository Cleanup, E2E Testing setup, and implementing the Feature Flag engine.

### Version 0.2.0 - Phase 1 Complete (Architecture Freeze)
*Date: 2026-07-28*

**Summary:**
This release completes Phase 1 of the implementation plan, focusing on repository cleanup, architecture freeze, and ensuring a solid foundation for future development. A progress tracker was added, and existing documentation was updated to reflect the completion of this phase.

**Documentation Updates:**
*   Created `implementation/26_PROGRESS.md` to track implementation phases.
*   Appended `26_PROGRESS.md` to the Implementation Documents index in `README.md`.
*   Updated `implementation/24_BACKLOG.md` to mark Phase 1 as completed.

**Architecture Changes:**
*   Confirmed adherence to architectural rules. Linting and testing pipelines pass successfully.

**Database Changes:**
*   *None.*

**API Changes:**
*   *None.*

**Feature Changes:**
*   *None.*

**Breaking Changes:**
*   *None.*

### Version 0.3.0 - Phase 2 Complete (Feature Flag System)
*Date: 2026-07-28*

**Summary:**
Implemented a comprehensive, database-backed Feature Flag system (Phase 2). This system allows granular enabling and disabling of application modules per tenant.

**Architecture Changes:**
*   Created a backend `FeatureFlagService` and `FeatureFlagController` for querying and bulk-updating flags.
*   Introduced a `requireFeature` Express middleware to securely restrict endpoint access based on active flags.
*   Implemented a frontend `FeatureFlagProvider` with a `useFeatureFlags` context hook.
*   Integrated a Super Admin UI to toggle feature flags directly within the `ManagerSettings` dashboard.

**Database Changes:**
*   Added `FeatureFlag` model bridging `restaurantId` to specific feature `key`s with an `enabled` boolean.
*   Updated seed scripts to default-populate 16 core feature flags.

**API Changes:**
*   **New**: `GET /api/v1/restaurants/:restaurantId/feature-flags` - Retrieves all feature flags for a tenant.
*   **New**: `PATCH /api/v1/restaurants/:restaurantId/feature-flags` - Bulk updates feature flag states.

**Feature Changes:**
*   Frontend sidebar and bottom navigation automatically hide the 'Analytics', 'Menu Management', 'Tables Management', and 'Waiter Calls' modules based on feature toggles.

**Tests:**
*   Added comprehensive Vitest suites for `FeatureFlagService` and middleware isolation.
*   Added Frontend React Testing Library tests for `useFeatureFlags` hook logic.
