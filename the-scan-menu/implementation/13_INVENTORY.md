# Inventory Management Module Architecture & Specification

## 1. Overview

Phase 12 introduces **Inventory Management** to The Scan Menu. The module allows restaurant Managers and Staff to monitor item availability ("86'd status") and quantity-based stock counts in real time across all four Phase 8 ordering modes (Dine-In, Takeaway, Delivery, Counter POS).

---

## 2. Core Concepts & Scope

- **Item Availability (86ing)**: A binary toggle (`isAvailable`) that instantly prevents an item from being ordered across all public customer menus and staff counter POS interfaces.
- **Stock Depletion Tracking**: Optional per-item quantity tracking (`trackStock: boolean`, `stockQuantity: number`). Ordering a tracked item decrements its stock quantity atomically in MongoDB.
- **Auto-86 on Zero Stock**: When stock reaches zero, the item automatically transitions to `isAvailable = false`, preventing further orders.
- **Low Stock Threshold & Alerts**: Per-item warning threshold (`lowStockThreshold: number`, default: 5). Surfaces visual warning badges in the Manager/Staff UI when stock falls to or below threshold.
- **Audit Logging**: All availability toggles, manual stock adjustments, order-driven stock decrements, and system auto-86s are persisted in the `InventoryLog` collection for historical dispute resolution.
- **Petpooja POS Integration Gap**: Petpooja's API does not currently expose a real-time endpoint for external item availability or stock synchronization. Inventory state is managed authoritatively within The Scan Menu, keeping POS interactions non-blocking.

---

## 3. Data Architecture

### MenuItem Model Additions
```typescript
interface IMenuItem {
  isAvailable: boolean;        // Binary 86'd toggle (default: true)
  trackStock: boolean;         // Enable quantity-based tracking (default: false)
  stockQuantity: number;       // Current stock count (default: 0)
  lowStockThreshold: number;   // Low stock warning threshold (default: 5)
}
```

### RestaurantSettings Additions
```typescript
interface IRestaurantSettingsInventory {
  enableLowStockAlerts: boolean;     // Default: true
  defaultLowStockThreshold: number; // Default: 5
  auto86OnZeroStock: boolean;       // Default: true
}
```

### InventoryLog Audit Collection
```typescript
interface IInventoryLog {
  restaurantId: ObjectId;
  menuItemId: ObjectId;
  actorType: 'MANAGER' | 'STAFF' | 'SYSTEM' | 'ORDER';
  actorId?: ObjectId;
  action: 'AVAILABILITY_TOGGLE' | 'STOCK_ADJUSTMENT' | 'ORDER_DECREMENT' | 'AUTO_86';
  previousQuantity?: number;
  newQuantity?: number;
  previousAvailability: boolean;
  newAvailability: boolean;
  orderId?: ObjectId;
  reason?: string;
  createdAt: Date;
}
```

---

## 4. Concurrency & Anti-Overselling Pattern

Stock decrement is performed atomically at the service layer during order validation:

```typescript
const updatedItem = await MenuItem.findOneAndUpdate(
  {
    _id: itemId,
    restaurantId,
    isAvailable: true,
    trackStock: true,
    stockQuantity: { $gte: requestedQty }
  },
  { $inc: { stockQuantity: -requestedQty } },
  { new: true }
);
```

- **Atomic Guard**: The condition `{ stockQuantity: { $gte: requestedQty } }` guarantees that concurrent requests cannot decrement stock below zero.
- **Rollback on Partial Failure**: If a multi-item order fails midway due to a race condition on one item, all previously decremented items in that order request are automatically rolled back (`$inc: +qty`).
- **HTTP 400 ITEMS_UNAVAILABLE**: Rejection payloads return explicit item-level details to inform the customer which item became out of stock.

---

## 5. API Endpoints

- `PATCH /api/v1/restaurants/:restaurantId/menu-items/:itemId/availability` (Manager / Staff)
- `PATCH /api/v1/restaurants/:restaurantId/menu-items/:itemId/stock` (Manager only)
- `GET /api/v1/public/restaurants/:slug/menu` (Reflects current availability in real time)

---

## 6. Real-Time Transport

Reuses Phase 11 Socket.io infrastructure. Stock adjustments and availability changes emit `inventory:updated` events to the `restaurant:${restaurantId}` room, triggering real-time menu refetches for active customer menu sessions and staff dashboards.
