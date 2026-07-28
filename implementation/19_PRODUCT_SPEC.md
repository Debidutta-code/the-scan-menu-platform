# Product Specification

This document serves as the single source of truth for the TheScanMenu product vision, defining it as a modular Restaurant Operating System (Restaurant OS).

## Product Vision

TheScanMenu is **NOT** just a QR Menu application. It is a modular Restaurant Operating System designed to scale from small independent cafés requiring only a digital menu, to enterprise-level restaurant groups requiring full POS sync, KDS, and custom domain white-labeling.

The core philosophy is maximum modularity within a single codebase:
* One Frontend
* One Backend
* One Database
* One Codebase

Features are sold as modules, controlled strictly by Subscription Plans and Feature Flags, allowing restaurants to purchase and activate exactly what they need without software bloat.

---

## User Types

* **Customer**: Browses the menu, places orders, requests waiter assistance, and manages payments via their personal mobile device.
* **Waiter**: Uses the staff dashboard to monitor tables, accept/process orders, receive assistance alerts, and manage physical bills.
* **Kitchen**: Uses specialized, high-contrast digital displays (KDS) to track preparation items and routing.
* **Manager**: Oversees the entire tenant operation, manages staff, configures menus, resolves issues, and accesses analytical insights.
* **Restaurant Owner**: Focuses on high-level analytics, billing, subscription management, and white-label configurations.
* **Super Admin**: Manages the overarching SaaS platform, provisions new tenants, handles global feature flags, and monitors platform health.

---

## Subscription Plans

Plans define the ceiling of available features. The system is designed to seamlessly upsell modules.

| Plan | Target | Key Features Included |
| :--- | :--- | :--- |
| **Free** | Small Cafés | Basic QR Menu, Read-Only, No Ordering |
| **Starter** | Independent Restaurants | QR Menu, Basic Table Ordering, Waiter Call |
| **Professional** | Growing Businesses | Ordering, Basic Payments, Analytics, Basic POS Sync |
| **Enterprise** | Large Groups / Franchises | White-label, Custom Domains, Advanced POS, KDS, Loyalty, Open API |

* **Upgrade Path**: Seamless in-app upgrades trigger immediate feature flag unlocks via the backend without requiring a data migration.

---

## Modules

The system is compartmentalized into the following toggleable modules:

* **QR Menu**: The core digital catalog.
* **Ordering**: Allows cart creation and ticket submission to the backend.
* **Kitchen**: The KDS (Kitchen Display System) for back-of-house routing.
* **Inventory**: Stock depletion tracking tied to menu items.
* **Payments**: Digital checkout and gateway integration.
* **POS**: Synchronization with legacy systems (Petpooja, etc.).
* **Analytics**: Financial, operational, and staff performance dashboards.
* **Coupons**: Discount and promotional code engine.
* **Loyalty**: Customer retention and point accrual system.
* **Reservations**: Table booking and management ahead of time.
* **Reviews**: Internal review collection to intercept bad Google reviews.
* **Feedback**: Detailed customer satisfaction surveys.
* **CRM**: Customer relationship management and historical tracking.
* **Notifications**: SMS, Email, and Push notification routing for customers and staff.

---

## Payment Modes

The Payment Framework abstracts all transactions, supporting:

* **Prepaid**: Customer must pay before the kitchen receives the ticket (e.g., QSR).
* **Postpaid**: Customer pays at the end of the table session (e.g., Fine Dining).
* **Hybrid**: Customer can open a tab and pay via card tokenization at the end.
* **Cash**: Handled manually by waiters/managers; system acts as a ledger.
* **UPI**: Direct digital payments standard in applicable regions.
* **Gateway**: Credit/Debit via integrated providers (Stripe, Razorpay, Square).

---

## Ordering Modes

The system adapts the checkout flow based on the selected mode:

* **Dine-in**: Requires Table/Zone selection; integrates with Table Sessions.
* **Takeaway**: Requires customer name/phone; bypasses Table logic.
* **Delivery**: Requires full address collection and integrates with potential delivery aggregator APIs.
* **Counter**: Staff-facing rapid entry mode (acts as a lightweight POS).

---

## POS Integrations

The system utilizes an Adapter Framework to communicate asynchronously with external systems:

* **Current**: `NoOpIntegration` (Standalone mode).
* **Planned**: Petpooja, UrbanPiper.
* **Future**: Toast, Square, Oracle MICROS, Rista.

---

## Feature Flags

Every modular feature is gated by configuration. Key flags include (but are not limited to):
* `ENABLE_ORDERING`
* `ENABLE_PAYMENTS`
* `ENABLE_POS_SYNC`
* `ENABLE_KDS`
* `ENABLE_LOYALTY`
* `ENABLE_RESERVATIONS`
* `ENABLE_WHITE_LABEL`

Flags are evaluated contextually per `restaurantId` based on their active Subscription Plan.

---

## White Label Features

Designed for enterprise clients wanting brand purity:
* Complete color theme customization (Primary, Secondary, Accent).
* Typography customization.
* Logo and Cover Image branding.
* **Custom Subdomains**: `tenant.thescanmenu.com`.
* **Custom Domains**: `menu.tenant.com`.
* Removal of "Powered by TheScanMenu" branding.

---

## Product Principles

To maintain sanity and scalability as the platform grows, all development must adhere to these commercial principles:

* **Single Codebase**: There is only one repository.
* **Multi Tenant**: The architecture fundamentally isolates data by tenant ID without needing separate database instances.
* **Modular SaaS**: Features are discrete. A restaurant should never see UI for a feature they haven't purchased.
* **API First**: The backend should be consumable by any client (our web app, a future mobile app, or a third-party integration).
* **Feature Flag Driven**: Deployments and feature rollouts are decoupled. Code goes to production hidden behind flags.
* **Subscription Driven**: Access to feature flags is automated based on the tenant's commercial billing tier.
* **White Label Ready**: UI components must always consume theme variables rather than hardcoded colors, ensuring enterprise readiness.

---

## Non Goals

To prevent scope creep and technical bankruptcy, TheScanMenu will **never**:

* **Never maintain multiple frontends**: We will not build a separate React app for Restaurant A and Restaurant B.
* **Never maintain multiple backends**: We will not deploy a separate Node instance just for an enterprise client.
* **Never fork the product for different customers**: Custom features must be integrated into the main branch behind a feature flag.
* **Never hardcode integrations**: We will not write Petpooja-specific logic inside the core Order controller. All third parties must go through generic adapters.
* **Never create customer-specific branches**: The `main` branch is the only source of truth.

---

## Future Vision

**The Restaurant Operating System**
TheScanMenu will evolve into the central nervous system for hospitality venues. By maintaining a modular, API-first architecture, it will act as the single source of truth for menus, operations, and customer data. It will not just run alongside a POS; in many cases, it will become the POS, the KDS, and the CRM combined into a single, cohesive, modern web application.
