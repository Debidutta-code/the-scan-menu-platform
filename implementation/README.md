# Implementation Documents

This directory contains the complete architectural, technical, and strategic documentation for **TheScanMenu**, a production SaaS platform.

These documents are meant to provide a comprehensive understanding of the project's current state and its future direction without altering existing code. They establish the context and rules for any future feature implementations, ensuring that the project remains maintainable by a single developer and adheres to its architectural principles.

## Document Index

* **[00_PROJECT_AUDIT.md](./00_PROJECT_AUDIT.md)**: A high-level audit summarizing the major user flows (restaurant, menu, ordering, waiter, payment) and role systems currently in place.
* **[01_ARCHITECTURE.md](./01_ARCHITECTURE.md)**: Details the overall system design, deployment strategies, and high-level structure of the monorepo.
* **[02_DATABASE.md](./02_DATABASE.md)**: Documents the MongoDB (Mongoose) schema models that power the platform.
* **[03_FRONTEND.md](./03_FRONTEND.md)**: Explains the Vite + React client architecture, including routing, state management, and the design system.
* **[04_BACKEND.md](./04_BACKEND.md)**: Covers the Express + Node.js API server, including services, integrations, and WebSockets.
* **[05_API.md](./05_API.md)**: An overview of the REST endpoints exposing the platform's capabilities.
* **[06_AUTHORIZATION.md](./06_AUTHORIZATION.md)**: Details the authentication flow (JWT, cookies) and role-based access control.
* **[07_MULTI_TENANT.md](./07_MULTI_TENANT.md)**: Describes the multi-tenant architecture and how data is isolated per restaurant.
* **[08_FEATURE_FLAGS.md](./08_FEATURE_FLAGS.md)**: Outlines the approach for using feature flags to manage and deploy new capabilities safely.
* **[09_PAYMENT_ARCHITECTURE.md](./09_PAYMENT_ARCHITECTURE.md)**: Details the current payment implementations and future strategies for gateway integrations.
* **[10_POS_INTEGRATION.md](./10_POS_INTEGRATION.md)**: Explains the adapter pattern used for connecting to external Point-Of-Sale systems.
* **[11_SECURITY.md](./11_SECURITY.md)**: Summarizes the security posture, including JWTs, rate limiting, and data protection.
* **[12_PERFORMANCE.md](./12_PERFORMANCE.md)**: Covers performance considerations on both the client (rendering, state) and server (caching, queries).
* **[13_TECH_DEBT.md](./13_TECH_DEBT.md)**: Identifies areas of technical debt, duplicated code, or missing tests that should be addressed over time.
* **[14_FOLDER_STRUCTURE.md](./14_FOLDER_STRUCTURE.md)**: A map of the monorepo directory layout for quick navigation.
* **[15_IMPLEMENTATION_PLAN.md](./15_IMPLEMENTATION_PLAN.md)**: A phased implementation plan breaking down the roadmap into actionable development steps.
* **[16_FUTURE_ROADMAP.md](./16_FUTURE_ROADMAP.md)**: The long-term vision for the platform, including major features like Kitchen Display and Subdomains.
* **[17_AI_CONTEXT.md](./17_AI_CONTEXT.md)**: Crucial context and guidelines designed specifically for AI assistants working on this codebase.
* **[18_REPOSITORY_RULES.md](./18_REPOSITORY_RULES.md)**: Hard rules and conventions that must be followed to maintain code quality and architectural integrity.
* **[19_PRODUCT_SPEC.md](./19_PRODUCT_SPEC.md)**: The single source of truth for the product vision, features, and commercial modules.
