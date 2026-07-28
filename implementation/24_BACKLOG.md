# Product Backlog

This document represents the official, prioritized product backlog for TheScanMenu, derived directly from the implementation plan (`15_IMPLEMENTATION_PLAN.md`).

---

## Critical Priority
*Must be completed immediately to ensure the architectural foundation is sound before adding commercial features.*

*   **Repository Cleanup & Architecture Freeze**
    *   *Description*: Enforce coding standards, validate documentation, and write critical acceptance tests.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 1
    *   *Status*: Not Started

*   **Restaurant Feature Flag System**
    *   *Description*: Implement the backend engine and frontend hooks to toggle modules per tenant.
    *   *Dependencies*: Phase 1
    *   *Estimated Phase*: Phase 2
    *   *Status*: Not Started

*   **Subscription Plan System**
    *   *Description*: Tie feature flags to commercial tiers (Free, Starter, Pro, Enterprise).
    *   *Dependencies*: Phase 2
    *   *Estimated Phase*: Phase 3
    *   *Status*: Not Started

---

## High Priority
*Core commercial features required to onboard paying customers and reach initial revenue targets.*

*   **Restaurant Configuration Module**
    *   *Description*: Build the Manager settings UI for Branding, Taxes, and Timings.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 4
    *   *Status*: Not Started

*   **Payment Abstraction Framework**
    *   *Description*: Create the generic adapter pattern for processing digital payments.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 6
    *   *Status*: Not Started

*   **Razorpay Adapter Implementation**
    *   *Description*: Integrate Razorpay SDK and webhooks for the Indian market.
    *   *Dependencies*: Phase 6
    *   *Estimated Phase*: Phase 7
    *   *Status*: Not Started

*   **Ordering Modes Expansion**
    *   *Description*: Decouple orders from TableSessions to support Takeaway and Delivery.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 8
    *   *Status*: Not Started

---

## Medium Priority
*High-value integrations and operational tools for established restaurants.*

*   **POS Adapter Framework**
    *   *Description*: Create asynchronous, non-blocking interfaces for POS synchronization.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 9
    *   *Status*: Not Started

*   **Petpooja Integration**
    *   *Description*: Implement the specific adapter mapping payload data to Petpooja APIs.
    *   *Dependencies*: Phase 9
    *   *Estimated Phase*: Phase 10
    *   *Status*: Not Started

*   **Kitchen Display System (KDS)**
    *   *Description*: Build the touch-optimized, station-routed display for back-of-house staff.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 11
    *   *Status*: Not Started

*   **Analytics Module Expansion**
    *   *Description*: Advanced MongoDB aggregation pipelines for revenue and performance charting.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 13
    *   *Status*: Not Started

---

## Low Priority
*Enterprise-tier features to expand TAM (Total Addressable Market) and ARPU (Average Revenue Per User).*

*   **Subdomain Architecture**
    *   *Description*: Configure frontend routing to handle `tenant.thescanmenu.com`.
    *   *Dependencies*: Phase 4
    *   *Estimated Phase*: Phase 5
    *   *Status*: Not Started

*   **White Label Capabilities**
    *   *Description*: Deep CSS injection and custom domain support (`menu.tenant.com`).
    *   *Dependencies*: Phase 5
    *   *Estimated Phase*: Phase 14
    *   *Status*: Not Started

*   **Plugin Framework (Open API)**
    *   *Description*: Secure API key generation and webhook subscriptions for third-party extensions.
    *   *Dependencies*: None
    *   *Estimated Phase*: Phase 15
    *   *Status*: Not Started

---

## Future Ideas
*Conceptual features not yet scheduled in the main roadmap.*

*   **Reservations Engine**
    *   *Description*: Native table booking and capacity management.
    *   *Status*: Not Started
*   **Coupons & Promotions**
    *   *Description*: Advanced discounting rules engine.
    *   *Status*: Not Started
*   **Loyalty & CRM**
    *   *Description*: Customer tracking and points accrual.
    *   *Status*: Not Started
*   **Counter POS Hardware Integration**
    *   *Description*: Cash drawer kicking and receipt printer support.
    *   *Status*: Not Started

---

## Technical Debt
*Backlog of architectural cleanup and debt repayment.*

*   **Custom Error Classes**
    *   *Description*: Implement typed error classes (`NotFoundError`, `UnauthorizedError`) across the API.
    *   *Status*: Not Started

---

## Performance Improvements
*Infrastructure scaling initiatives.*

*   **Production Hardening (Redis & BullMQ)**
    *   *Description*: Implement Redis for Socket scaling and BullMQ for background jobs.
    *   *Dependencies*: Completion of core features (Phase 1-15)
    *   *Estimated Phase*: Phase 16
    *   *Status*: Not Started

---

## Developer Experience
*Tooling to improve engineering velocity.*

*   **Playwright Integration**
    *   *Description*: Setup comprehensive End-to-End browser testing.
    *   *Status*: Not Started

---

## Nice To Have
*Quality of life improvements for users.*

*   **Inventory Module**
    *   *Description*: Basic stock depletion tracking tied to menu item orders.
    *   *Estimated Phase*: Phase 12
    *   *Status*: Not Started
