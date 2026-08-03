# 21_USER_FLOWS.md - User Flows Specification

This document details the step-by-step user interaction flows across the Pixora QR Platform.

---

## 1. Dine-In Ordering Flow (Existing)
1. **Scan Table QR**: Customer scans unguessable QR token -> resolves table & restaurant theme (`GET /public/restaurants/:slug/tables/:token`).
2. **Browse Menu**: Customer views menu categories, items, and add-ons (`GET /public/restaurants/:slug/tables/:token/menu`).
3. **Cart & Round Placement**: Customer builds cart -> submits order -> creates `TableSession` if new round or merges into active round (`POST /public/restaurants/:slug/tables/:token/orders`). Order mode is explicitly set to `DINE_IN`.
4. **Order Tracking**: Customer tracks live order status via WebSockets or polling.

---

## 2. Takeaway Ordering Flow (Phase 8 New)
1. **Generic Ordering Entry**: Customer visits generic slug URL `/r/:restaurantSlug/order` -> selects **Takeaway** mode.
2. **Customer Details**: Customer inputs Name and Mobile Phone Number.
3. **Cart & Placement**: Customer selects items -> places order (`POST /public/restaurants/:restaurantSlug/orders` with `orderMode: 'TAKEAWAY'`).
4. **Payment Gating**: Order follows restaurant's configured `activeMode` (`PREPAID` or `POSTPAID`).
5. **Kitchen Display**: Order appears on staff dashboard labeled "Takeaway" without a table assignment.

---

## 3. Delivery Ordering Flow (Phase 8 New)
1. **Generic Ordering Entry**: Customer visits generic slug URL `/r/:restaurantSlug/order` -> selects **Delivery** mode.
2. **Customer & Address Collection**: Customer inputs Name, Mobile Phone Number, and Full Delivery Address.
3. **Order Placement & Prepayment**:
   - If Razorpay digital payment is configured: Customer completes payment intent modal (`POST /public/restaurants/:restaurantSlug/payments/intent`). Order is placed with `paymentStatus: 'PENDING'` and remains gated from active kitchen queue until webhook confirmation updates `paymentStatus: 'PAID'`.
   - If restaurant is on Cash (`CASH`): Order is placed as active and labeled "Cash on Delivery".
4. **Kitchen Display**: Order becomes visible to staff labeled "Delivery" with full delivery address displayed.

---

## 4. Counter POS Ordering Flow (Phase 8 New)
1. **Staff Dashboard Entry**: Authenticated Staff/Manager opens `/manager/counter` inside the dashboard.
2. **Item Selection**: Staff selects menu items, enters optional customer name/phone.
3. **Rapid Punch**: Staff clicks "Punch Counter Order".
4. **Direct Activation**: Order is created via `POST /api/v1/restaurants/:restaurantId/orders/counter` with `orderMode: 'COUNTER'`, `paymentStatus: 'PAID'`, `source: 'POS'`, and immediately appears active on the kitchen prep queue.

---

## 5. POS Integration & Sync Observability Flow (Phase 10 New)
1. **Manager Configuration**: Manager accesses `/manager/settings` -> POS Integration section -> enters encrypted Petpooja API credentials (`appKey`, `appSecret`, `accessToken`, `outletId`) -> clicks **Save Petpooja Credentials** (`PATCH /api/v1/restaurants/:restaurantId/integrations/petpooja/config`).
2. **Catalog Synchronization**: Manager clicks **Sync Menu** (`POST /api/v1/restaurants/:restaurantId/integrations/petpooja/sync-menu`) -> background process synchronizes items and sets `externalIds.petpooja`.
3. **Automated Non-Blocking Ticket Push**: Upon any order placement (`DINE_IN`, `TAKEAWAY`, `DELIVERY`, `COUNTER`), `posIntegrationService.pushOrderAsync` dispatches the order to Petpooja asynchronously.
4. **Staff & Kitchen Observability**: Staff order cards in `/manager/orders` render real-time sync indicators (`[Synced]` in green or `[Sync Failed]` in red).
5. **Inbound Webhook Sync**: Status updates from Petpooja POS terminals hit `POST /api/v1/webhooks/petpooja` to reflect status changes directly on the staff dashboard.

---

## 6. Kitchen Display Operations Flow (Phase 11 New)
1. **Kitchen Terminal Access**: Kitchen staff opens `/manager/kds` on a kitchen tablet or display screen.
2. **Real-Time Ticket Ingestion**: Newly placed orders across all four modes (`DINE_IN`, `TAKEAWAY`, `DELIVERY`, `COUNTER`) appear as ticket cards via Socket.io `order:created` room events.
3. **Station Filtering**: Line cooks can filter display tickets by station/category (e.g. Hot Mains, Grill, Beverages) or view all stations.
4. **Touch Item Progression**: Kitchen staff taps item action buttons (`Start Prep` ➔ `Mark Ready` ➔ `Serve Item`) to advance item statuses (`PENDING` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`).
5. **Real-Time Synchronized Observability**: Item status updates broadcast to staff dashboards (`/manager/orders`). When item updates cause aggregate order status to change, `posIntegrationService.updateOrderStatusAsync` automatically relays the status update to Petpooja POS non-blockingly.
6. **Ticket Bump Resolution**: Staff taps **Bump Entire Ticket** to resolve all items on a ticket to `SERVED`, removing the completed ticket from active kitchen view.
