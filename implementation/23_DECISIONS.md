# Architecture Decision Records (ADR)

## Purpose
This document logs significant architectural decisions made during the development of TheScanMenu. It provides context on *why* a particular technology, pattern, or strategy was chosen, ensuring alignment as the team and codebase scale.

## How to Record Decisions
When a major technical choice is made (e.g., introducing a new core dependency, changing a data flow pattern), append a new record to this file using the template below.

## Decision Template
```markdown
### [Short Title of Decision]
*   **Context:** [What is the problem or situation?]
*   **Decision:** [What was chosen?]
*   **Consequences:** [What are the positive and negative impacts? How does it affect the system?]
*   **Alternatives Considered:** [What else was evaluated and why was it rejected?]
```

---

## Current Decisions

### Single Monorepo Architecture
*   **Context:** Managing separate frontend and backend repositories introduces version mismatch risks and deployment complexity.
*   **Decision:** Utilize npm workspaces to maintain the entire application (client, server, docs) in a single monorepo.
*   **Consequences:** Easier full-stack refactoring, shared linting/formatting rules, and simplified CI/CD. Can increase initial clone time and requires careful dependency boundary management.
*   **Alternatives Considered:** Multi-repo setup (rejected due to synchronization overhead for solo/small teams).

### Multi-Tenant SaaS
*   **Context:** The platform must serve thousands of restaurants securely.
*   **Decision:** Implement a logical multi-tenancy model where all tenants share a single database and application instance, isolated by a mandatory `restaurantId` on all operational records.
*   **Consequences:** Maximum cost efficiency and ease of maintenance. Requires strict, centralized middleware (`requireRestaurantAccess`) to prevent cross-tenant data leaks.
*   **Alternatives Considered:** Database-per-tenant (rejected due to massive infrastructure overhead and schema migration complexity).

### Single Database Strategy
*   **Context:** Data storage is required for operational orders, menus, and users.
*   **Decision:** Use a single, unified database to store all tenant data.
*   **Consequences:** Simplifies backup, restore, and connection pooling. May face scaling challenges under extreme load compared to sharded databases.
*   **Alternatives Considered:** Polyglot persistence (e.g., Cassandra for orders, Postgres for users) - rejected as premature optimization.

### MongoDB (Current)
*   **Context:** Initial MVP required rapid iteration of heavily nested data structures (menus, categories, order item snapshots).
*   **Decision:** Use MongoDB (with Mongoose ODM) for its flexible document schema.
*   **Consequences:** High development velocity and easy handling of unstructured integrations. Lacks strict relational constraints (foreign keys), requiring application-level integrity checks.
*   **Alternatives Considered:** SQL databases (deferred).

### Planned PostgreSQL Migration (Future)
*   **Context:** As the platform shifts to a massive SaaS, financial reconciliation, inventory, and complex cross-table analytics become paramount.
*   **Decision:** Eventually migrate the core operational database to PostgreSQL.
*   **Consequences:** ACID compliance, strict relational integrity, and better analytical querying capabilities. Will require a massive, highly risky data migration effort.
*   **Alternatives Considered:** Staying on MongoDB forever (rejected due to long-term relational complexities in billing and inventory).

### Single Frontend Strategy
*   **Context:** Different clients (free tier, enterprise, takeaway-only) have different UI needs.
*   **Decision:** Maintain exactly one React codebase. All UI variations are handled dynamically via routing, feature flags, and tenant configuration.
*   **Consequences:** Eliminates duplicated UI bugs and dramatically speeds up feature delivery. Increases the complexity of the main React router and state management.
*   **Alternatives Considered:** Forking the codebase for white-label clients (rejected as an unmaintainable anti-pattern).

### Single Backend Strategy
*   **Context:** Different regions or enterprise clients might demand custom API endpoints.
*   **Decision:** Maintain exactly one Node.js/Express backend. Custom behaviors are controlled via generic configuration objects and the Adapter Pattern.
*   **Consequences:** Ensures a unified API surface and centralizes security patching.
*   **Alternatives Considered:** Deploying separate microservices for different client tiers (rejected as over-engineering for the current scale).

### Feature Flag Architecture
*   **Context:** Releasing code safely and allowing commercial gating of features.
*   **Decision:** Build a robust, tenant-aware feature flag evaluation engine. New code goes to production disabled by default.
*   **Consequences:** Enables trunk-based development and decoupling deployment from release. Requires rigorous cleanup of obsolete flags to prevent tech debt.
*   **Alternatives Considered:** Git feature branches running forever (rejected due to merge conflicts and integration hell).

### Subscription Driven Features
*   **Context:** Monetizing the platform effectively.
*   **Decision:** Hardcode the relationship between commercial Subscription Plans (Free, Pro, Enterprise) and the activation of specific Feature Flags.
*   **Consequences:** Sales and engineering are tightly aligned. Upgrades instantly unlock UI elements.
*   **Alternatives Considered:** Manual toggling of flags by support staff (rejected as unscalable).

### Adapter Pattern for POS
*   **Context:** The platform must integrate with numerous disjointed third-party Point of Sale systems (Petpooja, Toast, etc.).
*   **Decision:** Implement a strict Interface/Adapter pattern. Core code never knows about specific vendors. It calls generic methods (`syncMenu()`, `pushOrder()`) on a dynamically instantiated adapter.
*   **Consequences:** Integrations can be built, tested, and swapped without touching core order processing logic.
*   **Alternatives Considered:** Hardcoding Petpooja API calls into the Order controller (rejected as tightly coupled and brittle).

### REST API First
*   **Context:** Communicating between the client and server, and eventually opening the platform to third parties.
*   **Decision:** Expose all backend functionality via strict, versioned RESTful APIs using standard JSON envelopes.
*   **Consequences:** Predictable, cacheable, and universally understood. Requires diligent documentation (OpenAPI/Swagger).
*   **Alternatives Considered:** GraphQL (rejected due to complexity in securing deeply nested multi-tenant queries at this stage) or tRPC (rejected as it hinders third-party generic API consumption).

### React + Vite
*   **Context:** Building a fast, interactive, mobile-first web app.
*   **Decision:** Use React 18+ bundled with Vite.
*   **Consequences:** Blazing fast Hot Module Replacement (HMR) during development and highly optimized production builds.
*   **Alternatives Considered:** Next.js (rejected as Server-Side Rendering is unnecessary for an authenticated SaaS dashboard and a highly dynamic QR menu, reducing infrastructure costs).

### Express Backend
*   **Context:** Serving the REST API.
*   **Decision:** Use Express.js with TypeScript.
*   **Consequences:** Massive ecosystem, proven reliability, and easy middleware chaining. Can be verbose and lacks built-in DI (Dependency Injection) containers out of the box.
*   **Alternatives Considered:** NestJS (considered, but rejected to maintain maximum simplicity and lower the barrier to entry for the current codebase).

### Socket.IO for Realtime
*   **Context:** Staff need immediate notification when a customer places an order or calls for a waiter.
*   **Decision:** Use Socket.IO for WebSocket management.
*   **Consequences:** Built-in fallback to long-polling, easy room management (vital for tenant isolation). Requires a Redis adapter for horizontal scaling across multiple Node instances.
*   **Alternatives Considered:** Raw WebSockets (rejected due to lack of connection recovery), Server-Sent Events (SSE) (rejected as bi-directional communication might be needed later).

### Zustand for Global State
*   **Context:** Managing the customer's shopping cart and user theme preferences across the React app.
*   **Decision:** Use Zustand.
*   **Consequences:** Minimal boilerplate, prevents unnecessary re-renders (no Context provider wrapping the whole app), and easy `sessionStorage` persistence.
*   **Alternatives Considered:** Redux Toolkit (rejected as overly complex and boilerplate-heavy for current needs).

### React Query for Server State
*   **Context:** Fetching, caching, and updating data from the REST API (Orders, Menus, Analytics).
*   **Decision:** Use TanStack React Query.
*   **Consequences:** Dramatically reduces custom `useEffect` fetching logic, handles cache invalidation gracefully, and provides out-of-the-box loading/error states.
*   **Alternatives Considered:** Fetching directly in `useEffect` and storing in Zustand (rejected as an anti-pattern for server state).

### White Label Architecture
*   **Context:** Enterprise clients demand brand purity (their own URLs and colors).
*   **Decision:** Architect the frontend routing to parse wildcards/subdomains dynamically, mapping them to the tenant, and inject CSS variables (`--primary-color`) dynamically based on tenant config.
*   **Consequences:** A single deployment can look like 100 different applications. Highly complex DNS and SSL certificate management at the edge.
*   **Alternatives Considered:** Deploying isolated instances for enterprise clients (rejected per the Single Backend/Frontend rules).
