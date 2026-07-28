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
