# Implementation Plan (Phased Roadmap)

This document outlines a structured, 16-phase approach to implementing the Restaurant OS vision. The roadmap prioritizes commercial readiness, modularity, and rapid customer acquisition over premature infrastructure optimization.

## Phase 1: Repository Cleanup & Architecture Freeze
* **Goal**: Ensure the codebase is stable, documented, and strictly follows architectural rules before new feature development.
* **Business Value**: Reduces technical debt, speeds up future onboarding of developers, and ensures a solid foundation for scale.
* **Technical Objective**: Enforce coding standards, validate all existing documentation, and write critical acceptance tests for existing flows.
* **Dependencies**: None
* **Files Expected to Change**: package.json, eslintrc, vitest.config.ts, tests/acceptance/*
* **Database Impact**: None
* **API Impact**: None
* **Frontend Impact**: Refactoring for linting compliance.
* **Backend Impact**: Refactoring for linting compliance.
* **Risks**: Over-refactoring might introduce subtle bugs in currently working code.
* **Migration Notes**: None
* **Rollback Strategy**: Git revert.
* **Acceptance Criteria**: Zero lint errors, all tests pass, architecture rules are enforced in CI.
* **Testing Requirements**: Unit and Acceptance tests must pass.
* **Estimated Complexity**: Low

## Phase 2: Restaurant Feature Flag System
* **Goal**: Implement a system where modules (Menu, Ordering, Waiter Call, KDS, etc.) can be toggled per restaurant.
* **Business Value**: Allows selling different feature combinations to different restaurants without maintaining multiple codebases.
* **Technical Objective**: Create a scalable feature flag evaluation engine.
* **Dependencies**: Phase 1
* **Files Expected to Change**: server/src/models/FeatureFlag.ts, server/src/services/featureFlag.service.ts, client/src/hooks/useFeatureFlags.ts
* **Database Impact**: New `FeatureFlags` collection.
* **API Impact**: New `GET /restaurants/:id/features` endpoint.
* **Frontend Impact**: Wrap major UI components in conditional renders based on flags.
* **Backend Impact**: Add flag checks in operational services.
* **Risks**: Complex UI state management if flags change dynamically.
* **Migration Notes**: Seed script needs to grant default flags to existing restaurants.
* **Rollback Strategy**: Disable flag evaluation middleware and default to 'true'.
* **Acceptance Criteria**: A feature can be turned off for Restaurant A but remain on for Restaurant B.
* **Testing Requirements**: Integration tests verifying flag evaluation logic.
* **Estimated Complexity**: Medium

## Phase 3: Subscription Plan System
* **Goal**: Tie feature flags to commercial subscription plans (Free, Starter, Professional, Enterprise).
* **Business Value**: Creates a clear upgrade path and directly drives MRR (Monthly Recurring Revenue).
* **Technical Objective**: Map subscription tiers to specific arrays of allowed feature flags.
* **Dependencies**: Phase 2
* **Files Expected to Change**: server/src/models/SubscriptionPlan.ts, server/src/models/Restaurant.ts
* **Database Impact**: New `SubscriptionPlans` collection, update `Restaurant.subscription`.
* **API Impact**: Update `/admin/restaurants` to assign plans.
* **Frontend Impact**: Show 'Upgrade required' UI for gated features.
* **Backend Impact**: Automate feature flag assignment based on plan.
* **Risks**: Locking existing users out of features they currently use.
* **Migration Notes**: Backfill existing tenants to 'Enterprise' to prevent disruption.
* **Rollback Strategy**: Revert plan assignment logic.
* **Acceptance Criteria**: Changing a restaurant's plan automatically updates their available feature flags.
* **Testing Requirements**: Unit tests mapping plans to flags.
* **Estimated Complexity**: Medium

## Phase 4: Restaurant Configuration Module
* **Goal**: Expose all branding and operational settings to the Manager dashboard.
* **Business Value**: Reduces onboarding support overhead by making the product self-serve.
* **Technical Objective**: Build a comprehensive settings UI for Tax, Timings, Branding, and Localization.
* **Dependencies**: None
* **Files Expected to Change**: client/src/pages/ManagerSettings.tsx, server/src/controllers/restaurant.controller.ts
* **Database Impact**: Expand `Restaurant` schema with localization and operational fields.
* **API Impact**: Expand `PATCH /restaurants/:id` validation schema.
* **Frontend Impact**: Large form creation with Zod validation.
* **Backend Impact**: Ensure validation handles complex nested config objects.
* **Risks**: Form complexity leading to poor UX.
* **Migration Notes**: Ensure default values for new config fields.
* **Rollback Strategy**: Revert UI changes.
* **Acceptance Criteria**: Managers can update all branding and operational settings without engineering intervention.
* **Testing Requirements**: Form validation and submission tests.
* **Estimated Complexity**: Medium

## Phase 5: Subdomain Architecture
* **Goal**: Support tenant-specific URLs (e.g., `cafe.thescanmenu.com`).
* **Business Value**: Provides a premium, white-label feel for professional and enterprise clients.
* **Technical Objective**: Configure DNS wildcard and implement frontend middleware to parse subdomains.
* **Dependencies**: Phase 4
* **Files Expected to Change**: client/vite.config.ts, client/src/App.tsx
* **Database Impact**: None
* **API Impact**: None
* **Frontend Impact**: Routing logic must extract subdomain and map to `restaurantSlug`.
* **Backend Impact**: Ensure CORS supports wildcard subdomains.
* **Risks**: DNS propagation issues, local development complexity.
* **Migration Notes**: None
* **Rollback Strategy**: Revert routing middleware.
* **Acceptance Criteria**: Visiting `subdomain.domain.com` loads the correct restaurant context.
* **Testing Requirements**: E2E tests mocking subdomain headers.
* **Estimated Complexity**: High

## Phase 6: Payment Abstraction Framework
* **Goal**: Create a generic, provider-agnostic framework for processing payments.
* **Business Value**: Allows rapid onboarding of restaurants globally by easily swapping payment providers.
* **Technical Objective**: Implement an Adapter pattern for payments supporting Prepaid, Postpaid, and Hybrid flows.
* **Dependencies**: None
* **Files Expected to Change**: server/src/integrations/payments/PaymentProvider.ts, server/src/services/payment.service.ts
* **Database Impact**: New `Transactions` collection.
* **API Impact**: New internal payment routing endpoints.
* **Frontend Impact**: Abstracted checkout flow.
* **Backend Impact**: Core logic for intent creation, capture, and webhooks.
* **Risks**: Financial data discrepancies.
* **Migration Notes**: None
* **Rollback Strategy**: Revert to session-only billing.
* **Acceptance Criteria**: System supports a generic 'Cash' adapter successfully.
* **Testing Requirements**: Unit tests for the adapter factory and interfaces.
* **Estimated Complexity**: High

## Phase 7: Razorpay Adapter Implementation
* **Goal**: Integrate Razorpay using the Payment Framework.
* **Business Value**: Unlocks the Indian market for digital payments.
* **Technical Objective**: Implement the Razorpay SDK and secure webhook handlers.
* **Dependencies**: Phase 6
* **Files Expected to Change**: server/src/integrations/payments/RazorpayAdapter.ts, client/src/components/RazorpayCheckout.tsx
* **Database Impact**: Store Razorpay specific transaction IDs in the `Transactions` collection.
* **API Impact**: New webhook endpoint `/webhooks/razorpay`.
* **Frontend Impact**: Inject Razorpay JS SDK dynamically.
* **Backend Impact**: Verify webhook signatures.
* **Risks**: API key leaks, missed webhooks.
* **Migration Notes**: None
* **Rollback Strategy**: Disable Razorpay in the Payment Factory.
* **Acceptance Criteria**: A customer can successfully pay via Razorpay and the order status updates.
* **Testing Requirements**: Mock Razorpay API responses and webhook payloads.
* **Estimated Complexity**: High

## Phase 8: Ordering Modes Expansion
* **Goal**: Support Dine-In, Takeaway, Delivery, and Counter ordering.
* **Business Value**: Expands the Total Addressable Market (TAM) beyond just dine-in restaurants.
* **Technical Objective**: Decouple ordering logic from `TableSession` to support session-less orders.
* **Dependencies**: None
* **Files Expected to Change**: server/src/models/Order.ts, client/src/pages/PublicCart.tsx
* **Database Impact**: Make `tableId` and `sessionId` optional on `Order`.
* **API Impact**: Update order creation endpoint to accept `orderMode`.
* **Frontend Impact**: UI flow changes based on selected mode (e.g., ask for address if Delivery).
* **Backend Impact**: Complex validation based on mode.
* **Risks**: Breaking existing Dine-In analytics or tracking.
* **Migration Notes**: Backfill existing orders with `orderMode: 'DINE_IN'`.
* **Rollback Strategy**: Revert validation schemas.
* **Acceptance Criteria**: Customer can place a Takeaway order without scanning a table QR code.
* **Testing Requirements**: Integration tests for all 4 ordering modes.
* **Estimated Complexity**: High

## Phase 9: POS Adapter Framework
* **Goal**: Create a generic, provider-agnostic framework for POS integration.
* **Business Value**: A core USP; allows the platform to sit on top of any legacy system.
* **Technical Objective**: Refine the existing adapter pattern to ensure asynchronous, non-blocking execution.
* **Dependencies**: None
* **Files Expected to Change**: server/src/integrations/core/RestaurantIntegration.ts
* **Database Impact**: Enhance `IntegrationSyncLog`.
* **API Impact**: None
* **Frontend Impact**: None
* **Backend Impact**: Establish event-driven patterns for POS sync.
* **Risks**: Performance degradation if sync blocks the main thread.
* **Migration Notes**: None
* **Rollback Strategy**: Revert to NoOpIntegration.
* **Acceptance Criteria**: Framework defines clear `syncMenu` and `pushOrder` contracts.
* **Testing Requirements**: Unit tests for the Adapter Factory.
* **Estimated Complexity**: Medium

## Phase 10: Petpooja Integration
* **Goal**: Implement the specific adapter for Petpooja POS.
* **Business Value**: Captures a significant portion of the Indian restaurant market.
* **Technical Objective**: Map internal data structures to Petpooja's API payloads.
* **Dependencies**: Phase 9
* **Files Expected to Change**: server/src/integrations/adapters/PetpoojaIntegration.ts
* **Database Impact**: Store external Petpooja IDs on `MenuItem` and `Order`.
* **API Impact**: Webhook endpoints for Petpooja status updates.
* **Frontend Impact**: Sync error visibility.
* **Backend Impact**: Payload transformation logic.
* **Risks**: Third-party API changes breaking the integration.
* **Migration Notes**: None
* **Rollback Strategy**: Disable the adapter.
* **Acceptance Criteria**: Orders flow successfully into a Petpooja test environment.
* **Testing Requirements**: Mock Petpooja API responses extensively.
* **Estimated Complexity**: High

## Phase 11: Kitchen Display System (KDS)
* **Goal**: Provide a specialized digital display for the kitchen.
* **Business Value**: Replaces paper tickets, increasing kitchen efficiency and reducing errors.
* **Technical Objective**: Build a high-performance, real-time routing view for specific menu items.
* **Dependencies**: None
* **Files Expected to Change**: client/src/pages/ManagerKDS.tsx, server/src/models/MenuItem.ts
* **Database Impact**: Add `stationId` to `MenuItem`.
* **API Impact**: New KDS specific aggregation endpoints.
* **Frontend Impact**: New, touch-optimized, high-contrast UI.
* **Backend Impact**: Broadcast socket events specifically to KDS rooms.
* **Risks**: Socket overload in high-volume environments.
* **Migration Notes**: None
* **Rollback Strategy**: Hide KDS route.
* **Acceptance Criteria**: Kitchen staff see only items routed to their specific station.
* **Testing Requirements**: E2E testing of the KDS socket updates.
* **Estimated Complexity**: High

## Phase 12: Inventory Module
* **Goal**: Track stock depletion based on order volume.
* **Business Value**: Provides basic ERP functionality, increasing stickiness of the platform.
* **Technical Objective**: Link `MenuItem` orders to stock counts and trigger low-stock alerts.
* **Dependencies**: None
* **Files Expected to Change**: server/src/models/Inventory.ts, server/src/services/inventory.service.ts
* **Database Impact**: New `Inventory` collection.
* **API Impact**: CRUD endpoints for Inventory.
* **Frontend Impact**: Inventory management dashboard.
* **Backend Impact**: Order completion triggers inventory decrement.
* **Risks**: Race conditions during high concurrency depletion.
* **Migration Notes**: None
* **Rollback Strategy**: Disable inventory decrement logic.
* **Acceptance Criteria**: Ordering an item reduces its associated inventory count.
* **Testing Requirements**: Concurrency tests for stock depletion.
* **Estimated Complexity**: Medium

## Phase 13: Analytics Module Expansion
* **Goal**: Provide deep, actionable business intelligence.
* **Business Value**: Empowers owners with data, proving the platform's ROI.
* **Technical Objective**: Build complex MongoDB aggregation pipelines for time-series data.
* **Dependencies**: None
* **Files Expected to Change**: server/src/services/analytics.service.ts, client/src/components/Charts.tsx
* **Database Impact**: Ensure indexes are optimized for analytical queries.
* **API Impact**: New reporting endpoints.
* **Frontend Impact**: Integration of charting libraries (or custom SVGs).
* **Backend Impact**: Complex data transformation.
* **Risks**: Database performance degradation from heavy queries.
* **Migration Notes**: None
* **Rollback Strategy**: Revert to basic analytics.
* **Acceptance Criteria**: Managers can view revenue by hour, top items, and staff performance.
* **Testing Requirements**: Unit tests verifying aggregation pipeline output against known datasets.
* **Estimated Complexity**: Medium

## Phase 14: White Label Capabilities
* **Goal**: Allow enterprise clients to completely rebrand the application.
* **Business Value**: Unlocks high-ticket enterprise sales.
* **Technical Objective**: Dynamic CSS injection and custom domain routing.
* **Dependencies**: Phase 5
* **Files Expected to Change**: client/src/App.tsx, server/src/models/Restaurant.ts
* **Database Impact**: Add extensive branding fields to `Restaurant`.
* **API Impact**: None
* **Frontend Impact**: Heavy reliance on CSS variables for dynamic theming.
* **Backend Impact**: None
* **Risks**: UI breaking under unexpected color combinations.
* **Migration Notes**: None
* **Rollback Strategy**: Revert to default theme.
* **Acceptance Criteria**: Enterprise tenant shows zero 'TheScanMenu' branding and uses full custom colors.
* **Testing Requirements**: Visual regression tests.
* **Estimated Complexity**: Medium

## Phase 15: Plugin Framework (Public API & Webhooks)
* **Goal**: Allow third parties to build on top of TheScanMenu.
* **Business Value**: Creates an ecosystem, reducing the need to build every niche feature internally.
* **Technical Objective**: Secure API key generation and webhook dispatch system.
* **Dependencies**: None
* **Files Expected to Change**: server/src/routes/openapi.routes.ts, server/src/models/ApiKey.ts
* **Database Impact**: New `ApiKeys` and `Webhooks` collections.
* **API Impact**: New `v1/openapi` namespace with distinct auth middleware.
* **Frontend Impact**: Developer dashboard to generate keys.
* **Backend Impact**: Implement HMAC signing for outgoing webhooks.
* **Risks**: Security vulnerabilities and data leaks.
* **Migration Notes**: None
* **Rollback Strategy**: Disable open API routes.
* **Acceptance Criteria**: Third party can retrieve menu and receive order creation webhooks.
* **Testing Requirements**: Extensive security and authorization testing.
* **Estimated Complexity**: High

## Phase 16: Production Hardening & Infrastructure
* **Goal**: Ensure the platform can scale to thousands of concurrent restaurants securely.
* **Business Value**: Prevents churn due to downtime or slow performance.
* **Technical Objective**: Implement Redis, BullMQ, advanced rate limiting, and caching.
* **Dependencies**: Phases 1-15
* **Files Expected to Change**: server/src/utils/cache.ts, server/src/jobs/*
* **Database Impact**: Offload read-heavy queries to Redis cache.
* **API Impact**: Faster response times.
* **Frontend Impact**: None directly.
* **Backend Impact**: Major infrastructure additions.
* **Risks**: Cache invalidation bugs showing stale data.
* **Migration Notes**: Infrastructure provisioning (Redis).
* **Rollback Strategy**: Disable caching layer.
* **Acceptance Criteria**: System handles 10x current load in load testing.
* **Testing Requirements**: Load testing and stress testing.
* **Estimated Complexity**: High
