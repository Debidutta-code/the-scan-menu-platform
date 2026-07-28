# Future Roadmap

This document outlines the long-term vision for TheScanMenu, expanding beyond the immediate phased implementation plan to establish it as a premier modular restaurant platform.

## 1. True White-Labeling & Subdomains
Transitioning from shared URLs (`thescanmenu.com/p/restaurant-slug`) to dedicated subdomains (`restaurant.thescanmenu.com`) or even custom domains (`order.restaurant.com`). This requires edge-routing configuration (e.g., Vercel Edge Middleware) and automated SSL provisioning.

## 2. Advanced Kitchen Display System (KDS)
While the current manager dashboard tracks orders, a true KDS requires:
*   **Station Routing**: Sending drinks to the bar iPad and food to the kitchen screen.
*   **Bump Bars**: Keyboard-navigable UI for environments where touchscreens are impractical.
*   **Prep-Time Analytics**: Deep tracking of how long items stay in specific states to identify kitchen bottlenecks.

## 3. Subscription & Billing Engine
Integrating a billing engine (e.g., Stripe Billing) for the SaaS platform itself.
*   **Tiers**: Free tier (basic QR menu), Pro tier (Order taking, POS sync), Enterprise (White label, Custom domains).
*   **Automated Suspension**: Suspending tenants automatically if platform subscription payments fail.

## 4. Ecosystem Integrations (Beyond POS)
*   **Inventory Management**: Syncing depletion of stock based on recipes linked to MenuItems.
*   **Loyalty & CRM**: Tracking repeat customers via phone numbers (currently stored in orders) to offer automated discounts.
*   **Delivery Aggregators**: Acting as a central hub for orders coming from UberEats, DoorDash, etc., standardizing them before pushing to the POS.

## 5. Plugin Architecture
Opening the platform up. Providing secure API keys and a Webhook registration system so restaurants can build custom scripts (e.g., flashing a light in the kitchen when a VIP customer orders).

## 6. Multi-Language & Localization
*   Supporting i18n on the frontend for customer-facing menus.
*   Supporting multiple currencies beyond a simple string display (handling exchange rates if applicable).
