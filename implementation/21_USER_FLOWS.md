# User Flows

This document details the core business flows of the platform, from tenant onboarding to complex multi-mode operational scenarios.

---

## 1. Complete End-to-End Onboarding & Operations

**Business Goal**: Convert a prospect into a fully operational tenant accepting digital orders.

**User Journey**:
Restaurant Signup → Subscription Selection → Restaurant Created → Manager Login → Configure Restaurant → Create Menu → Generate QR → Customer Scan → Place Order → Kitchen → Serve → Payment → Review

**Frontend Flow**:
*   Super Admin dashboard to provision tenant.
*   Manager dashboard (`/manager/settings`) to set branding and tax.
*   Manager dashboard (`/manager/menu`) to build categories.
*   Manager dashboard (`/manager/tables`) to generate and print SVGs.
*   Public customer UI (`/p/:slug/table/:token`) to view and order.
*   Staff dashboard (`/manager/orders`) to progress Kanban states.

**Backend Flow**:
*   Tenant provision triggers default feature flags based on the selected subscription.
*   Customer order triggers `Socket.IO` event to alert staff.
*   Order progression (`PREPARING` → `SERVED`) tracks timestamps for analytics.
*   Session settlement triggers `PAID` state and potential webhook dispatches.

**Database Objects Used**:
*   `User`, `Restaurant`, `RestaurantStaff`, `SubscriptionPlan`
*   `Category`, `MenuItem`, `Tax`, `TableZone`, `Table`
*   `TableSession`, `Order`

**API Endpoints**:
*   `POST /admin/restaurants`
*   `PATCH /restaurants/:id`
*   `POST /restaurants/:id/menu/items`
*   `POST /public/restaurants/:slug/tables/:token/orders`
*   `PATCH /restaurants/:id/orders/:orderId/status`

**Future Improvements**:
*   Self-serve onboarding for Restaurant Owners without Super Admin intervention.
*   Automated Stripe billing upon subscription selection.

---

## 2. QR Menu Only (Free Tier)

**Business Goal**: Acquire top-of-funnel users with a zero-friction, read-only digital menu.

**User Journey**:
Customer Scans QR → Browses Categories → Views Item Details → Exits.

**Frontend Flow**:
*   Public menu UI renders. Cart and 'Call Waiter' FABs are hidden based on feature flags.

**Backend Flow**:
*   Standard public menu payload delivery. No websocket connections required.

**Database Objects Used**:
*   `Restaurant`, `Category`, `MenuItem`

**API Endpoints**:
*   `GET /public/restaurants/:slug/tables/:token/menu`

**Future Improvements**:
*   Injecting non-intrusive upsell banners ("Want to order from your phone? Ask the manager to upgrade!").

---

## 3. QR Menu + Ordering (Starter/Pro Tier)

**Business Goal**: Standard digital ordering to increase average order value (AOV) and reduce wait times.

**User Journey**:
Customer Scans QR → Browses → Adds to Cart → Places Order → Staff Accepts → Staff Serves → Settle Bill.

**Frontend Flow**:
*   Customer uses Zustand-managed cart.
*   Staff uses real-time Kanban board to progress orders.

**Backend Flow**:
*   Order placement joins `TableSession`. Socket events broadcast to staff room. Item-level status rollup handles aggregate states.

**Database Objects Used**:
*   `TableSession`, `Order`

**API Endpoints**:
*   `POST /public/restaurants/:slug/tables/:token/orders`
*   `POST /restaurants/:id/table-sessions/:sessionId/close`

**Future Improvements**:
*   Allowing customers to edit their cart *after* placing an order if the status is still `PENDING`.

---

## 4. QR Menu + POS (Pro/Enterprise Tier)

**Business Goal**: Integrate with existing workflows so restaurants don't have to change their primary system.

**User Journey**:
Customer Scans → Places Order → Order hits TheScanMenu → Order pushes to Petpooja → Kitchen prints physical ticket from POS.

**Frontend Flow**:
*   Staff dashboard shows POS sync status on order cards (e.g., "Synced", "Sync Failed - Retry").

**Backend Flow**:
*   Order saves locally. Background job (BullMQ) dispatches payload to POS adapter. POS adapter handles translation and retries.

**Database Objects Used**:
*   `Order`, `IntegrationSyncLog`

**API Endpoints**:
*   Internal API / Background Jobs interacting with external POS APIs.

**Future Improvements**:
*   Two-way sync: If an order is canceled on the POS, webhook updates TheScanMenu automatically.

---

## 5. QR Menu + POS + KDS (Enterprise Tier)

**Business Goal**: Full digital transformation of the back-of-house operations.

**User Journey**:
Customer Orders → System pushes to POS for billing → System *also* routes items to specific KDS screens (e.g., Drinks to Bar iPad, Food to Kitchen TV).

**Frontend Flow**:
*   Introduction of `/manager/kds` route. Touch-optimized, high-contrast, item-level grid instead of order-level Kanban.

**Backend Flow**:
*   Order items are split based on `stationId` and broadcast to specific socket rooms (e.g., `room:restaurant_123:station_bar`).

**Database Objects Used**:
*   `Order`, `MenuItem`, `Station` (Future)

**API Endpoints**:
*   `GET /restaurants/:id/kds/:stationId/active`

**Future Improvements**:
*   Prep-time alerts (flashing red if an item is unfulfilled for > 15 minutes).

---

## 6. Takeaway Flow

**Business Goal**: Capture foot traffic and phone orders without tying up tables.

**User Journey**:
Customer scans generic counter QR / enters URL → System asks for Name & Phone → Orders → Prep → Customer collects.

**Frontend Flow**:
*   Cart intercepts checkout to demand customer details since `tableToken` is bypassed.

**Backend Flow**:
*   Order created with `orderMode: 'TAKEAWAY'`. No `TableSession` is created or linked.

**Database Objects Used**:
*   `Order`

**API Endpoints**:
*   `POST /public/restaurants/:slug/orders` (Sessionless variant)

**Future Improvements**:
*   SMS notifications to customer when Takeaway order transitions to `READY`.

---

## 7. Delivery Flow

**Business Goal**: Enable first-party delivery to avoid third-party aggregator commissions.

**User Journey**:
Customer visits URL → Selects Delivery → Inputs Address → Orders (Prepaid Required) → Dispatched.

**Frontend Flow**:
*   Heavy address collection form. Strict enforcement of digital payment before submission.

**Backend Flow**:
*   Order created with `orderMode: 'DELIVERY'`. Intent created via Payment Framework.

**Database Objects Used**:
*   `Order`, `Transaction` (Future)

**API Endpoints**:
*   `POST /public/restaurants/:slug/orders`

**Future Improvements**:
*   Integration with last-mile delivery APIs (e.g., Dunzo, Stuart) to automate driver dispatch.

---

## 8. Counter POS Flow

**Business Goal**: Allow staff to quickly punch in orders for walk-in cash customers without a physical POS.

**User Journey**:
Customer walks to counter → Staff opens `/manager/pos` → Taps items rapidly → Selects 'Cash' → Ticket prints to kitchen.

**Frontend Flow**:
*   A specialized, dense React view optimized for staff speed. Bypasses public cart animations.

**Backend Flow**:
*   Direct authenticated order creation. Auto-transitions to `ACCEPTED` or `PREPARING` immediately.

**Database Objects Used**:
*   `Order`

**API Endpoints**:
*   `POST /restaurants/:id/orders/pos`

**Future Improvements**:
*   Hardware integration for automated cash drawer kicking.

---

## 9. White Label Customer (Enterprise Tier)

**Business Goal**: Provide brand purity for large restaurant groups.

**User Journey**:
Customer visits a standard subdomain (e.g., `bobsburgers.thescanmenu.com`) → Sees zero platform branding, entirely custom fonts and colors.

**Frontend Flow**:
*   Vite config and React Router handle subdomain parsing. CSS variables injected deeply based on tenant config.

**Backend Flow**:
*   Public resolution API fetches tenant config based on subdomain instead of slug parameter.

**Database Objects Used**:
*   `Restaurant.theme`

**API Endpoints**:
*   `GET /public/resolve-domain/:subdomain`

**Future Improvements**:
*   Allowing tenants to upload custom CSS snippets.

---

## 10. Custom Domain Customer (Enterprise Tier)

**Business Goal**: Ultimate enterprise offering where the platform acts purely as infrastructure.

**User Journey**:
Customer visits `menu.bobsburgers.com` → CNAME routes to Vercel/Edge → Platform resolves tenant perfectly.

**Frontend Flow**:
*   Edge middleware intercepts host header to map custom domain to internal `restaurantSlug`.

**Backend Flow**:
*   Similar to subdomain flow, but mapping relies on a `customDomain` field in the database.

**Database Objects Used**:
*   `Restaurant.customDomain`

**API Endpoints**:
*   `GET /public/resolve-domain/:customDomain`

**Future Improvements**:
*   Automated SSL certificate provisioning (via Let's Encrypt / API) when a manager adds a custom domain.
