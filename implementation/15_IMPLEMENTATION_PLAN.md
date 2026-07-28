# Implementation Plan (Phased Roadmap)

This document outlines a structured, phased approach to implementing remaining features and resolving technical debt. It contains 20 distinct implementation phases.

## Phase 1: Setup E2E Testing Framework
* **Goal**: Introduce End-to-End testing to ensure critical user flows are covered.
* **Why this phase exists**: E2E tests catch integration issues that unit tests might miss.
* **Files likely affected**: package.json, playwright.config.ts, tests/e2e/
* **Dependencies**: None
* **Risks**: Flaky tests might slow down CI/CD pipelines.
* **Acceptance Criteria**: Playwright is installed and a basic smoke test passes.

## Phase 2: Implement Custom Error Classes
* **Goal**: Standardize error handling across the backend API.
* **Why this phase exists**: Provides consistent error structures and simplifies controller logic.
* **Files likely affected**: server/src/utils/errors.ts, server/src/middleware/errorHandler.ts
* **Dependencies**: None
* **Risks**: Missed error catching in older controllers.
* **Acceptance Criteria**: All custom errors extend a base AppError and return correct HTTP statuses.

## Phase 3: Redis Integration for Socket.IO
* **Goal**: Allow Socket.IO events to be broadcast across multiple server instances.
* **Why this phase exists**: Necessary for horizontal scalability of the real-time features.
* **Files likely affected**: server/src/sockets/socket.service.ts, server/package.json
* **Dependencies**: Redis server available.
* **Risks**: Potential latency in event broadcasting.
* **Acceptance Criteria**: Socket events are successfully propagated through the Redis adapter.

## Phase 4: Background Job Queue (BullMQ)
* **Goal**: Offload asynchronous tasks like emails and integrations to a background queue.
* **Why this phase exists**: Improves API response times and adds retry capabilities for failed tasks.
* **Files likely affected**: server/src/jobs/, server/src/services/email.service.ts
* **Dependencies**: Phase 3 (Redis)
* **Risks**: Job failures need monitoring.
* **Acceptance Criteria**: Emails are sent via background jobs instead of inline processing.

## Phase 5: Feature Flags Schema & Service
* **Goal**: Create the foundational data models and services for feature flags.
* **Why this phase exists**: Enables safe rollouts and trunk-based development.
* **Files likely affected**: server/src/models/FeatureFlag.ts, server/src/services/featureFlag.service.ts
* **Dependencies**: None
* **Risks**: Performance overhead if not cached properly.
* **Acceptance Criteria**: Feature flags can be created, updated, and queried via backend services.

## Phase 6: Feature Flags Admin UI
* **Goal**: Build the frontend interface for Super Admins to manage feature flags.
* **Why this phase exists**: Allows non-technical staff to control feature rollouts.
* **Files likely affected**: client/src/pages/AdminFeatureFlags.tsx, client/src/services/admin.service.ts
* **Dependencies**: Phase 5
* **Risks**: Accidental toggling of critical features.
* **Acceptance Criteria**: Super Admins can view and toggle flags; changes reflect in the backend.

## Phase 7: Payment Provider Interface
* **Goal**: Define the core interfaces for payment processing adapters.
* **Why this phase exists**: Prepares the system to support multiple payment gateways.
* **Files likely affected**: server/src/integrations/payments/PaymentProvider.ts
* **Dependencies**: None
* **Risks**: Interface might not cover all future gateway requirements.
* **Acceptance Criteria**: A clear interface with createIntent, capture, and refund methods exists.

## Phase 8: Razorpay Integration Core
* **Goal**: Implement the Razorpay payment adapter.
* **Why this phase exists**: Provides digital payment capabilities for the Indian market.
* **Files likely affected**: server/src/integrations/payments/RazorpayAdapter.ts, server/package.json
* **Dependencies**: Phase 7
* **Risks**: API key exposure.
* **Acceptance Criteria**: Razorpay adapter successfully creates order intents.

## Phase 9: Payment Webhook Handlers
* **Goal**: Create secure endpoints to receive payment status updates from gateways.
* **Why this phase exists**: Ensures accurate payment status even if the client disconnects.
* **Files likely affected**: server/src/routes/webhook.routes.ts, server/src/controllers/webhook.controller.ts
* **Dependencies**: Phase 8
* **Risks**: Webhook replay attacks.
* **Acceptance Criteria**: Valid webhooks update order payment status; invalid webhooks are rejected.

## Phase 10: Frontend Payment Checkout Flow
* **Goal**: Integrate the Razorpay SDK into the customer cart.
* **Why this phase exists**: Allows customers to complete digital payments from their devices.
* **Files likely affected**: client/src/pages/PublicTable.tsx, client/src/components/Checkout.tsx
* **Dependencies**: Phase 9
* **Risks**: Complex state management during payment processing.
* **Acceptance Criteria**: Customers can successfully pay and see real-time status updates.

## Phase 11: POS Integration - Petpooja Adapter
* **Goal**: Implement the actual API calls for Petpooja POS.
* **Why this phase exists**: Replaces stubs with real integration for a major POS vendor.
* **Files likely affected**: server/src/integrations/adapters/PetpoojaIntegration.ts
* **Dependencies**: None
* **Risks**: Third-party API rate limits and downtime.
* **Acceptance Criteria**: Orders are successfully pushed to Petpooja API.

## Phase 12: POS Sync Queueing
* **Goal**: Move POS sync logic to the background job queue.
* **Why this phase exists**: Prevents POS API latency from blocking customer checkouts.
* **Files likely affected**: server/src/jobs/posSync.job.ts, server/src/controllers/order.controller.ts
* **Dependencies**: Phase 4, Phase 11
* **Risks**: Stale data if queue falls behind.
* **Acceptance Criteria**: Orders sync to POS asynchronously with retry logic.

## Phase 13: POS Integration Error UI
* **Goal**: Display POS sync failures to restaurant managers.
* **Why this phase exists**: Managers need visibility when orders fail to reach the POS.
* **Files likely affected**: client/src/pages/ManagerOrders.tsx, client/src/components/SyncStatusBadge.tsx
* **Dependencies**: Phase 12
* **Risks**: Cluttered UI if errors are frequent.
* **Acceptance Criteria**: Failed syncs are visible, with an option to manually retry.

## Phase 14: Kitchen Display System (KDS) Data Routing
* **Goal**: Add station routing logic to menu items.
* **Why this phase exists**: Allows directing drinks to the bar and food to the kitchen.
* **Files likely affected**: server/src/models/MenuItem.ts, server/src/models/Station.ts
* **Dependencies**: None
* **Risks**: Increased complexity in order processing.
* **Acceptance Criteria**: Menu items can be assigned to specific stations.

## Phase 15: KDS Role and Authorization
* **Goal**: Introduce a KITCHEN role with restricted access.
* **Why this phase exists**: Kitchen staff should only see the KDS, not management settings.
* **Files likely affected**: server/src/models/User.ts, server/src/middleware/requireRole.ts
* **Dependencies**: None
* **Risks**: Role conflicts for users with multiple responsibilities.
* **Acceptance Criteria**: KITCHEN role exists and restricts access appropriately.

## Phase 16: KDS Frontend View
* **Goal**: Build the Kitchen Display System UI.
* **Why this phase exists**: Provides a high-contrast, optimized view for back-of-house staff.
* **Files likely affected**: client/src/pages/ManagerKDS.tsx, client/src/components/KDSItem.tsx
* **Dependencies**: Phase 14, Phase 15
* **Risks**: Socket event overload on busy nights.
* **Acceptance Criteria**: KDS accurately displays items routed to the specific station.

## Phase 17: Subdomain Routing Architecture
* **Goal**: Configure frontend routing to handle wildcard subdomains.
* **Why this phase exists**: First step towards white-labeling for restaurants.
* **Files likely affected**: client/vite.config.ts, client/src/App.tsx
* **Dependencies**: None
* **Risks**: Local development complexity.
* **Acceptance Criteria**: Subdomains successfully resolve to the correct restaurant context.

## Phase 18: Enhanced Analytics Queries
* **Goal**: Implement advanced aggregation pipelines for deeper insights.
* **Why this phase exists**: Provides managers with data on peak times and item popularity.
* **Files likely affected**: server/src/services/analytics.service.ts
* **Dependencies**: None
* **Risks**: Slow queries impacting database performance.
* **Acceptance Criteria**: New analytics endpoints return accurate historical data.

## Phase 19: Analytics Frontend Charts
* **Goal**: Visualize the enhanced analytics data on the manager dashboard.
* **Why this phase exists**: Makes data easily consumable for restaurant owners.
* **Files likely affected**: client/src/pages/ManagerAnalytics.tsx, client/src/components/Charts.tsx
* **Dependencies**: Phase 18
* **Risks**: Performance issues rendering large datasets.
* **Acceptance Criteria**: Charts accurately reflect analytics data.

## Phase 20: Webhook Subscriptions (Plugins)
* **Goal**: Allow tenants to subscribe to platform events.
* **Why this phase exists**: Enables external systems (e.g., custom loyalty apps) to react to orders.
* **Files likely affected**: server/src/models/Webhook.ts, server/src/services/webhook.service.ts
* **Dependencies**: Phase 4
* **Risks**: Security vulnerabilities with external requests.
* **Acceptance Criteria**: Tenants can register URLs and receive payloads on order creation.
