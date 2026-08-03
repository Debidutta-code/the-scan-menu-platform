# DATABASE.md - Pixora QR Data Models Specification

This document specifies the authoritative schema, field constraints, validation rules, and indexes for all 20 MongoDB collections managed by Mongoose across the Pixora QR Platform.

---

## 1. User
Represents an identity on the platform with specific role authorization.
- **Collection Name:** `users`
- **Fields:**
  - `email`: `String` (Required, unique, trimmed, lowercase)
  - `passwordHash`: `String` (Required, bcrypt hash)
  - `role`: `String` (Required, enum: `SUPER_ADMIN` | `MANAGER` | `STAFF`)
  - `name`: `String` (Required, trimmed, 1-100 chars)
  - `isActive`: `Boolean` (Required, default: `true`)
  - `restaurants`: `Array` of `ObjectId` (ref: `Restaurant`)
  - `createdAt`, `updatedAt`: `Date` (Automated timestamps)
- **Indexes:** Unique index on `email`

---

## 2. RefreshToken
Implements secure JWT refresh token rotation with TTL cleanup.
- **Collection Name:** `refresh_tokens`
- **Fields:**
  - `userId`: `ObjectId` (Required, ref: `User`)
  - `tokenHash`: `String` (Required, unique, SHA-256 hash)
  - `expiresAt`: `Date` (Required)
  - `revokedAt`: `Date` (Optional)
  - `createdAt`: `Date` (Automated timestamp)
- **Indexes:** Unique on `tokenHash`, TTL index on `expiresAt`

---

## 3. Restaurant
Represents a distinct tenant on the SaaS platform.
- **Collection Name:** `restaurants`
- **Fields:**
  - `name`: `String` (Required, trimmed)
  - `slug`: `String` (Required, unique, lowercase, trimmed)
  - `code`: `String` (Required, unique, upper)
  - `status`: `String` (Required, enum: `ACTIVE` | `SUSPENDED` | `ARCHIVED` | `EXPIRED`)
  - `logoUrl`, `coverImageUrl`, `description`, `phone`, `email`, `address`: `String`
  - `currency`: `String` (Required, default: `'INR'`)
  - `timezone`: `String` (Required, default: `'Asia/Kolkata'`)
  - `createdAt`, `updatedAt`: `Date`
- **Indexes:** Unique index on `slug`, unique index on `code`

---

## 4. RestaurantSettings
Per-tenant operational, payment, workflow, and branding configuration.
- **Collection Name:** `restaurant_settings`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`, unique)
  - `currency`: `String` (default: `'INR'`)
  - `timezone`: `String` (default: `'Asia/Kolkata'`)
  - `branding`: `{ logoUrl, coverImageUrl, googleReviewUrl }`
  - `theme`: `{ primaryColor, secondaryColor, accentColor, fontFamily }`
  - `paymentConfig`:
    - `activeProvider`: `'CASH'` | `'RAZORPAY'` | `'STRIPE'` | `'SQUARE'`
    - `activeMode`: `'PREPAID'` | `'POSTPAID'` | `'HYBRID'`
    - `taxRatePercent`: `Number`
    - `razorpayConfig`: `{ keyId, keySecret, webhookSecret }` (Encrypted)
  - `workflow`:
    - `orderWorkflowMode`: `'FIVE_STEP'` | `'FOUR_STEP'` | `'THREE_STEP'`
    - `autoAcceptConfig`: `{ enabled: Boolean, delaySeconds: Number }`
- **Indexes:** Unique index on `restaurantId`

---

## 5. RestaurantStaff
Join table mapping Users to specific Tenant Restaurants with assigned roles.
- **Collection Name:** `restaurant_staff`
- **Fields:**
  - `userId`: `ObjectId` (Required, ref: `User`)
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `role`: `String` (Required, enum: `MANAGER` | `STAFF`)
  - `isActive`: `Boolean` (Required, default: `true`)
- **Indexes:** Compound unique index on `userId + restaurantId`

---

## 6. Table
Represents physical table placements in a restaurant matching unguessable QR tokens.
- **Collection Name:** `tables`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `zoneId`: `ObjectId` (Optional, ref: `TableZone`)
  - `tableNumber`: `String` (Required, trimmed)
  - `displayName`: `String` (Required, trimmed)
  - `token`: `String` (Required, unique unguessable token)
  - `isActive`: `Boolean` (Required, default: `true`)
  - `qrCodeUrl`: `String` (Required)
- **Indexes:** Unique index on `token`, compound unique index on `restaurantId + tableNumber`

---

## 7. TableZone
Logical area grouping for tables (e.g. Patio, Main Hall, Rooftop).
- **Collection Name:** `table_zones`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `name`: `String` (Required, trimmed)
  - `description`: `String`
  - `sortOrder`: `Number` (default: 0)
- **Indexes:** Compound unique index on `restaurantId + name`

---

## 8. TableSession
Represents an active multi-round dining session at a physical table.
- **Collection Name:** `table_sessions`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `tableId`: `ObjectId` (Required, ref: `Table`)
  - `status`: `String` (Required, enum: `OPEN` | `CLOSED`, default: `OPEN`)
  - `roundCount`: `Number` (default: 1)
  - `subtotal`, `tax`, `total`: `Number` (in cents/paise)
  - `openedAt`, `closedAt`: `Date`
- **Indexes:** Compound index on `restaurantId + tableId + status`

---

## 9. Order
Represents dining tickets across four ordering modes: Dine-In, Takeaway, Delivery, and Counter.
- **Collection Name:** `orders`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `tableId`: `ObjectId` (Optional, ref: `Table`) — required for `DINE_IN`
  - `sessionId`: `ObjectId` (Optional, ref: `TableSession`) — required for `DINE_IN`
  - `orderMode`: `String` (Required, enum: `'DINE_IN'` | `'TAKEAWAY'` | `'DELIVERY'` | `'COUNTER'`, default: `'DINE_IN'`)
  - `deliveryAddress`: `{ street, city, state, zipCode, fullAddress, notes }` (Optional, required for `DELIVERY`)
  - `roundNumber`: `Number` (Optional, default: 1)
  - `isMerged`: `Boolean` (Required, default: `false`)
  - `orderNumber`: `Number` (Required, sequential per restaurant)
  - `items`: `Array` of Object:
    - `menuItemId`: `ObjectId` (ref: `MenuItem`)
    - `nameSnapshot`: `String`
    - `unitPriceSnapshot`: `Number`
    - `quantity`: `Number` (min: 1)
    - `selectedAddOns`: `Array` of `{ name, priceDelta }`
    - `specialInstructions`: `String`
    - `itemStatus`: `String` (`PENDING` | `PREPARING` | `READY` | `SERVED`)
  - `subtotal`, `tax`, `total`: `Number` (in cents/paise)
  - `taxBreakdown`: `Array` of `{ name, percentage, amount, subTaxes }`
  - `customerNote`: `String`
  - `status`: `String` (Required, enum: `PENDING` | `ACCEPTED` | `PREPARING` | `READY` | `SERVED` | `CANCELLED`, default: `PENDING`)
  - `source`: `String` (Required, enum: `QR` | `POS` | `API` | `MANUAL`, default: `QR`)
  - `customerName`, `customerPhone`: `String`
  - `paymentStatus`: `String` (Required, enum: `PENDING` | `PAID`, default: `PENDING`)
  - `integrationMetadata`: `Mixed` (default: `{}`)
- **Indexes:**
  - Compound unique on `restaurantId + orderNumber`
  - Compound index on `restaurantId + status`
  - Compound index on `restaurantId + createdAt`
  - Compound index on `restaurantId + orderMode + createdAt`

---

## 10. OrderCounter (Counter)
Atomic counter for sequential order numbering per restaurant tenant.
- **Collection Name:** `order_counters`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`, unique)
  - `seq`: `Number` (Required, default: 0)

---

## 11. Category
Menu category container.
- **Collection Name:** `categories`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `name`: `String` (Required, trimmed)
  - `description`, `imageUrl`: `String`
  - `sortOrder`: `Number` (default: 0)
  - `isActive`: `Boolean` (default: `true`)
- **Indexes:** Index on `restaurantId + sortOrder`

---

## 12. MenuItem
Food and drink item catalog.
- **Collection Name:** `menu_items`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `categoryId`: `ObjectId` (Required, ref: `Category`)
  - `name`: `String` (Required, trimmed)
  - `description`, `imageUrl`: `String`
  - `price`: `Number` (Required, in cents/paise)
  - `isVegetarian`: `Boolean` (default: `false`)
  - `isAvailable`: `Boolean` (default: `true`)
  - `prepTimeMinutes`: `Number`
  - `addOns`: `Array` of `{ name, priceDelta }`
  - `sortOrder`: `Number` (default: 0)
- **Indexes:** Index on `restaurantId + categoryId + sortOrder`

---

## 13. Tax
Tax rates and compound tax groups configuration.
- **Collection Name:** `taxes`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `name`: `String` (Required)
  - `percentage`: `Number` (Required)
  - `type`: `String` (Required, enum: `'TAX'` | `'GROUP'`)
  - `groupId`: `ObjectId` (Optional, ref: `Tax`)
  - `isActive`: `Boolean` (default: `true`)

---

## 14. Transaction
Financial transaction ledger for payments.
- **Collection Name:** `transactions`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `tableSessionId`: `ObjectId` (Optional, ref: `TableSession`)
  - `orderId`: `ObjectId` (Optional, ref: `Order`)
  - `provider`: `String` (Required, enum: `'CASH'` | `'RAZORPAY'` | `'STRIPE'` | `'SQUARE'`)
  - `mode`: `String` (Required, enum: `'PREPAID'` | `'POSTPAID'` | `'HYBRID'`)
  - `amount`: `Number` (Required)
  - `currency`: `String` (default: `'INR'`)
  - `status`: `String` (Required, enum: `'PENDING'` | `'CAPTURED'` | `'FAILED'` | `'REFUNDED'`)
  - `providerReferenceId`: `String`
  - `metadata`: `Mixed`
- **Indexes:** Index on `restaurantId`, index on `orderId`

---

## 15. SubscriptionPlan
Tiered SaaS billing plan catalog.
- **Collection Name:** `subscription_plans`
- **Fields:**
  - `code`: `String` (Required, unique, upper)
  - `name`: `String` (Required)
  - `monthlyPrice`, `yearlyPrice`: `Number` (in paise/cents)
  - `features`: `Array` of `String`
  - `isActive`: `Boolean` (default: `true`)

---

## 16. FeatureFlag
Per-tenant feature enablement overrides.
- **Collection Name:** `feature_flags`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `key`: `String` (Required)
  - `enabled`: `Boolean` (Required)
- **Indexes:** Compound unique index on `restaurantId + key`

---

## 17. IntegrationSyncLog
POS and external integration synchronization audit log.
- **Collection Name:** `integration_sync_logs`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `orderId`: `ObjectId` (Optional, ref: `Order`)
  - `provider`: `String` (Required)
  - `operation`: `String` (Required, enum: `'SYNC_MENU'` | `'PUSH_ORDER'` | `'UPDATE_STATUS'`, default: `'PUSH_ORDER'`)
  - `status`: `String` (Required, enum: `'PENDING'` | `'SUCCESS'` | `'FAILED'` | `'ORDER_SYNC_PENDING'` | `'ORDER_SYNCED'` | `'ORDER_SYNC_FAILED'`, default: `'PENDING'`)
  - `syncAttempts`: `Number` (default: 1)
  - `errorMessage`: `String` (Optional)
  - `errorLog`: `String` (Optional)
  - `payloadSnapshot`: `Mixed` (Optional)
  - `createdAt`, `updatedAt`: `Date` (Automated timestamps)
- **Indexes:** Compound index on `restaurantId + createdAt` (sort desc), `restaurantId + status`, and `orderId`

---

## 18. WaiterCall
Table floor assistance and bill request tracking.
- **Collection Name:** `waiter_calls`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`)
  - `tableId`: `ObjectId` (Required, ref: `Table`)
  - `requestType`: `String` (Required, enum: `'CALL_WAITER'` | `'REQUEST_BILL'` | `'WATER'` | `'TISSUE'` | `'OTHER'`)
  - `status`: `String` (Required, enum: `'PENDING'` | `'ACKNOWLEDGED'` | `'RESOLVED'`, default: `'PENDING'`)
  - `requestedAt`: `Date` (default: `Date.now`)
  - `resolvedAt`: `Date`
- **Indexes:** Index on `restaurantId + status`

---

## 19. RestaurantOnboarding
Multi-step self-serve restaurant provisioning onboarding tracker.
- **Collection Name:** `restaurant_onboardings`
- **Fields:**
  - `userId`: `ObjectId` (Required, ref: `User`)
  - `step`: `Number` (default: 1)
  - `data`: `Mixed` (default: `{}`)
  - `isCompleted`: `Boolean` (default: `false`)

---

## 20. RestaurantStats
Aggregated analytics snapshot counter.
- **Collection Name:** `restaurant_stats`
- **Fields:**
  - `restaurantId`: `ObjectId` (Required, ref: `Restaurant`, unique)
  - `totalOrdersCount`: `Number` (default: 0)
  - `totalRevenue`: `Number` (default: 0)
  - `totalCancelledOrdersCount`: `Number` (default: 0)
