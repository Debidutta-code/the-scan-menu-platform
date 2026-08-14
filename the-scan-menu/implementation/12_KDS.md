# Kitchen Display System (KDS) Architecture

The Kitchen Display System (KDS) gives kitchen staff a real-time, touch-optimized view of active preparation tickets. It replaces paper kitchen chits with digital ticket cards, providing item-level status tracking and real-time station routing across all four ordering modes (`DINE_IN`, `TAKEAWAY`, `DELIVERY`, `COUNTER`).

---

## Architectural Principles

1. **Agile Ticket Aggregation**:
   A kitchen ticket is represented directly by an `Order` (and its constituent `items`). For Dine-In multi-round sessions, each ordering round generates a distinct ticket with its `roundNumber` and `tableId` clearly demarcated.

2. **Item-Level State Machine**:
   Item statuses transition monotonically forward:
   `PENDING` (Queued) ➔ `PREPARING` (In Kitchen) ➔ `READY` (Prepared) ➔ `SERVED` (Fulfilled).
   Backward status transitions are strictly validated and rejected (HTTP 400 Bad Request).

3. **Automatic Order Status Rollup**:
   Whenever an item status is advanced, the `Order` pre-save hook invokes `getOrderStatusRollup()`. If aggregate order status changes (e.g. from `ACCEPTED` to `PREPARING` or `SERVED`), central socket notifications are emitted to update staff dashboards, and non-blocking status updates relay to third-party POS adapters (e.g. Petpooja).

4. **Multi-Tenant Real-Time Socket Isolation**:
   KDS reuses the platform's Socket.io service (`SocketService`). When a kitchen tablet connects and joins `restaurant:${restaurantId}`, socket handshake authentication verifies JWT tokens and checks `RestaurantStaff` membership in the database to prevent cross-tenant ticket snooping.

5. **Graceful Offline Fallback**:
   If the Socket.io connection drops, the KDS interface displays a clear visual reconnecting indicator and automatically falls back to 10-second polling (`refetchInterval`), featuring a manual refresh button so staff never work off silent stale data.

---

## API Endpoints

- `GET /api/v1/restaurants/:restaurantId/kds/tickets`: Retrieve active kitchen tickets (`status` not `CANCELLED` and not `SERVED`). Supports filtering by `category` (station ID or name) and `orderMode`.
- `PATCH /api/v1/restaurants/:restaurantId/kds/tickets/:orderId/items/:itemIndex/status`: Advance a single item's status (`PENDING`, `PREPARING`, `READY`, `SERVED`).
- `POST /api/v1/restaurants/:restaurantId/kds/tickets/:orderId/bump`: Bump and resolve an entire ticket by marking all items `SERVED`.

---

## Real-Time Socket Events

- `order:created`: Emitted when a new order is punched (any mode). Triggers KDS ticket list invalidation.
- `order:item_status_updated`: Emitted when an item status changes (`{ orderId, itemIndex, itemStatus, updatedAt }`).
- `order:status_updated`: Emitted when aggregate order status changes (`{ orderId, status, updatedAt }`).

---

## Touch-Optimized UI Guidelines

- **Large Touch Targets**: Action buttons are minimum 44px height for tablet finger-tapping.
- **Visual Aging Timers**:
  - `0–5 min`: Green badge.
  - `5–15 min`: Amber badge.
  - `> 15 min`: Red blinking badge (`AGED`).
- **Station / Category Filter**: Allows line cooks to view specific stations (Grill, Bar, Pastry) or all stations simultaneously.
- **Special Instruction Callouts**: Customer notes and item customization instructions are highlighted in prominent amber callout boxes.
