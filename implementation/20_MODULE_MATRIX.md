# Module Matrix

This document defines the commercial architecture of TheScanMenu, outlining how features are bundled and sold as a modular SaaS platform.

## 1. Product Modules

The platform is divided into discrete modules that can be toggled via Feature Flags based on subscription plans.

*   **QR Menu**: Core digital catalog browsing.
*   **Ordering**: Cart creation and ticket submission.
*   **Waiter Call**: Customer assistance requests (Water, Bill, etc.).
*   **Kitchen Display (KDS)**: Back-of-house digital routing screens.
*   **Payment**: Digital checkout and gateway integrations (Payment Abstraction Framework & Razorpay Integration Phase 7).
*   **POS Integration**: Synchronization with legacy systems (POS Adapter Framework Phase 9, Petpooja Phase 10).
*   **Inventory**: Stock depletion tracking tied to menu items.
*   **Analytics**: Financial, operational, and staff dashboards.
*   **Coupons**: Discount and promotional code engine.
*   **CRM**: Customer relationship management and historical tracking.
*   **Loyalty**: Customer retention and point accrual system.
*   **Reservations**: Table booking and capacity management.
*   **Feedback**: Detailed customer satisfaction surveys.
*   **Reviews**: Internal review collection to manage online reputation.
*   **Notifications**: SMS/Email/Push alerts for customers and staff.
*   **White Label**: Custom domains, deep theming, and branding removal.
*   **API/Webhooks**: Open architecture for third-party extensions.

---

## 2. Subscription Matrix

| Module | Free | Starter | Professional | Enterprise |
| :--- | :--- | :--- | :--- | :--- |
| **QR Menu** | Included | Included | Included | Included |
| **Waiter Call** | Not Available | Included | Included | Included |
| **Ordering** | Not Available | Included | Included | Included |
| **Payment** | Not Available | Optional Add-on | Included | Included |
| **Analytics (Basic)** | Not Available | Included | Included | Included (Phase 13 Completed) |
| **Analytics (Advanced)** | Not Available | Not Available | Included | Included (Phase 13 Completed) |
| **Coupons & Feedback** | Not Available | Not Available | Included | Included |
| **Kitchen Display (KDS)** | Not Available | Not Available | Optional Add-on | Included (Phase 11 Completed) |
| **POS Integration** | Not Available | Not Available | Optional Add-on | Included |
| **Inventory** | Not Available | Not Available | Optional Add-on | Included (Phase 12 Completed) |
| **CRM & Loyalty** | Not Available | Not Available | Not Available | Included |
| **Reservations** | Not Available | Not Available | Not Available | Included |
| **White Label** | Not Available | Not Available | Not Available | Included |
| **API/Webhooks** | Not Available | Not Available | Not Available | Included |

---

## 3. Ordering Modes

The checkout and operational flow adapts based on the ordering mode.

*   **Dine In**: Customers scan a specific Table QR. Orders are grouped into a `TableSession`. Waiters fulfill orders to the physical table. Payments are typically postpaid or hybrid.
*   **Takeaway**: Customers scan a generic QR or use a URL. The system mandates customer name and phone number collection. Orders bypass table logic and alert staff for pickup preparation. Payments are typically prepaid.
*   **Delivery**: Customers order via URL. The system requires full address collection and integrates with external delivery aggregators. Payments are strictly prepaid.
*   **Counter POS**: Staff-facing mode for rapid entry. Operates as a lightweight POS system. Bypasses customer cart logic for immediate ticket generation and payment collection.

---

## 4. Payment Modes

The Payment Abstraction Framework supports diverse transaction methods:

*   **Cash**: Manual collection; the system acts purely as a ledger recording the transaction.
*   **UPI**: Direct bank transfers, standard in regions like India.
*   **Card**: Physical card swiping via external terminal (ledger mode) or digital entry.
*   **Razorpay**: Integrated gateway for digital intent creation and webhook capture (India focus).
*   **Stripe**: Integrated gateway for global digital payments.
*   **Postpaid**: The bill accumulates over a session and is settled at the end.
*   **Prepaid**: The ticket is not sent to the kitchen until the digital transaction succeeds.
*   **Hybrid**: Customers open a tab (card tokenized) but pay at the end, or part-pay in cash and part-pay digitally.

---

## 5. POS Modes

POS integration is never hardcoded. It utilizes a strict Adapter Pattern. The core system operates agnostically, pushing data outwards asynchronously.

Standalone
↓
Petpooja (Adapter - Phase 10 Completed)
↓
Square (Adapter - Planned)
↓
UrbanPiper (Adapter - Planned)
↓
Future Providers (Adapter)

**Architecture Rule**: If a POS API goes offline, TheScanMenu must continue to function perfectly as a standalone system, queuing sync events for later retry via background jobs.
