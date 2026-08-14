# Future Roadmap

This document outlines the long-term vision for TheScanMenu. The goal is to transition from a single-purpose QR menu tool into a comprehensive, modular **Restaurant Operating System**.

The roadmap is prioritized to maximize revenue, customer onboarding, product flexibility, and architectural modularity. Infrastructure optimizations are deferred until commercial completion.

## 1. Modular Feature Expansion
Expanding the platform to support a wider array of restaurant operations, allowing tenants to pick and choose modules based on their needs and subscription tier.
*   **Reservations Engine**: Table booking, waitlist management, and capacity planning.
*   **CRM & Loyalty**: Deep customer profiles, automated marketing based on order history, and point accrual systems.
*   **Coupons & Promotions**: A flexible discount engine supporting percentage, flat-rate, and BOGO offers.
*   **Reviews & Feedback**: Intercepting customer experiences before they hit public forums, providing actionable insights to managers.

## 2. Advanced Multi-Tenancy & White-Labeling
Making the platform invisible so the restaurant's brand shines.
*   **Custom Domains**: Moving beyond subdomains to support full CNAME masking (e.g., `menu.michelinstar.com`).
*   **Advanced Theming**: Injecting custom CSS or extended UI configuration options for enterprise clients.

## 3. The Central Hub (API & Integrations)
Positioning TheScanMenu as the central router for all digital restaurant operations.
*   **Delivery Aggregator API**: Becoming the single point of entry for UberEats, DoorDash, and Deliveroo, standardizing their diverse payloads into a single format before pushing them to the kitchen or POS.
*   **Inventory API**: Exposing menu consumption data to external inventory management systems.
*   **Open Plugin Architecture**: Allowing enterprise clients or third-party developers to build custom modules that interact directly with TheScanMenu's core APIs via Webhooks and OAuth.

## 4. Operational Maturity
Completing the operational suite to reduce reliance on legacy hardware.
*   **Hardware Agnostic Counter POS**: Building a rapid-entry interface on top of the existing platform to serve as a primary Point-of-Sale for cashiers, eliminating the need for separate POS software for smaller venues.
*   **Advanced KDS**: Deep routing, multi-screen setups, and prep-time analytics.

## 5. Global Scaling & Infrastructure Hardening
*These initiatives will be prioritized only after the core commercial product features are complete and the platform requires scaling to support massive concurrent load.*
*   **Redis & BullMQ**: For horizontal scaling of WebSockets and robust background job processing.
*   **Microservices Transition**: Identifying logical boundaries (e.g., separating the reporting engine from the core order processing engine) if the monolithic database becomes a bottleneck.
*   **Multi-Region Deployment**: Deploying read-replicas or regional clusters to reduce latency for global customers.
