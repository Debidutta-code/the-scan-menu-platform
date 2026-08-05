# API Architecture

TheScanMenu API is a RESTful service following strict conventions for predictability, security, and ease of integration.

## Base URL Configuration
All API routes are versioned. Currently, the active version is `v1`.
`Base URL: /api/v1`

## Standard Envelope
Every single API response, regardless of success or failure, is wrapped in a standard JSON envelope.

### Success (HTTP 2xx)
```json
{
  "success": true,
  "data": { ... },
  "message": "Human readable success message"
}
```

### Error (HTTP 4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable error message",
    "details": null
  }
}
```

## Route Namespaces

### 1. Authentication (`/auth`)
Handles user identity and session management using HTTP-only cookies and short-lived JWTs.
*   `POST /login`
*   `POST /refresh`
*   `POST /logout`
*   `GET /me`

### 2. Super Admin (`/admin`)
Platform-wide operations restricted to users with the `SUPER_ADMIN` role.
*   `GET /restaurants`: List all tenants.
*   `POST /restaurants`: Provision a new tenant.
*   `POST /restaurants/provision`: Programmatic multi-tenant provisioning (atomic restaurant + manager + default subscription creation).
*   `GET /restaurants/:id`: Get single tenant profile by ID.
*   `GET /restaurants/:id/onboarding`: Retrieve tenant onboarding progress and verification checklist.
*   `DELETE /restaurants/:id`: Deactivate / remove tenant.
*   `GET /stats`: Platform-wide aggregate metrics (total tenants, active/suspended counts, total orders).

### 2a. Subscription Plans (`/subscription`)
*   `GET /api/v1/subscription`: List all available platform subscription plans. (Any authenticated user).
*   `GET /api/v1/restaurants/:restaurantId/subscription`: Get a tenant's current subscription plan. (Auth + `requireRestaurantAccess`).
*   `PATCH /api/v1/restaurants/:restaurantId/subscription`: Assign or change a tenant's subscription plan. (SUPER_ADMIN only).

### 3. Public Menu & Ordering (`/public`)
Endpoints used by the customer-facing application. They do not require authentication but rely on public identifiers (slugs, tokens). Heavily rate-limited.
*   `GET /restaurants/:slug/tables/:tableToken`
*   `GET /restaurants/:slug/tables/:tableToken/menu`
*   `GET /restaurants/:slug/menu` (Sessionless Takeaway/Delivery menu)
*   `POST /restaurants/:slug/tables/:tableToken/orders` (Dine-In order placement)
*   `POST /restaurants/:slug/orders` (Sessionless Takeaway & Delivery order placement)
*   `POST /restaurants/:slug/payments/intent` (Sessionless payment intent)
*   `POST /restaurants/:slug/tables/:tableToken/waiter-call`
*   `POST /restaurants/:slug/tables/:tableToken/clear-session`

### 4. Tenant Operations (`/restaurants/:restaurantId`)
This is the primary namespace for manager and staff operations. **Crucially, all routes under this namespace require authentication AND are guarded by the `requireRestaurantAccess` middleware.**

Within this namespace, sub-routers handle specific domains:
*   `/menu`: CRUD operations for Categories and MenuItems. (Requires MANAGER for mutations).
*   `/tables`: CRUD operations for TableZones and Tables. (Requires MANAGER for mutations).
*   `/orders`: Fetching, filtering, and updating the status of customer orders. (Accessible by STAFF).
*   `/orders/counter`: Rapid Counter Order Entry for walk-in cash customers. (Accessible by STAFF and MANAGER).
*   `/waiter-calls`: Managing customer assistance requests. (Accessible by STAFF).
*   `/staff`: Managing staff access to the tenant. (Requires MANAGER). Endpoints: `POST`, `GET`, `PATCH /:staffId`, `DELETE /:staffId`.
*   `/analytics`: Reporting and metrics endpoints. (Requires MANAGER).
*   `/orders/analytics`: Order-specific analytics (order counts, revenue by date range) — distinct from the general analytics sub-router. (Requires MANAGER, `ordering` flag).
*   `/integrations/sync-logs`: Monitoring external POS synchronization audit logs. (Requires MANAGER, guarded by `pos_integration` feature flag).

## Security & Validation
*   Incoming request payloads (body, query params) are validated against Zod schemas in the route definitions before reaching controllers.
*   Public endpoints have stricter rate-limiting configurations applied to prevent abuse (e.g., order creation).

### Payments & POS Integrations (Phase 6–9)
*   `POST /api/v1/restaurants/:restaurantId/payments/intent` - Create a payment intent (Manager/Staff/Public)
*   `GET /api/v1/restaurants/:restaurantId/payments/transactions` - List transactions
*   `GET /api/v1/restaurants/:restaurantId/payments/transactions/:id` - Get transaction details
*   `PATCH /api/v1/restaurants/:restaurantId/payments/config` - Update active payment provider and mode (Manager/Super Admin)
*   `GET /api/v1/restaurants/:restaurantId/integrations/sync-logs` - View POS integration sync logs (Manager/Super Admin, `pos_integration` flag required)
*   `GET /api/v1/restaurants/:restaurantId/integrations/config` - View safe write-only integration config metadata (Manager/Super Admin, `pos_integration` flag required)
*   `PATCH /api/v1/restaurants/:restaurantId/integrations/petpooja/config` - Configure Petpooja API credentials with AES-256-GCM encryption (Manager/Super Admin, `pos_integration` flag required)
*   `POST /api/v1/restaurants/:restaurantId/integrations/petpooja/sync-menu` - Trigger background menu sync with Petpooja (Manager/Super Admin, `pos_integration` flag required)
*   `POST /api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/payments/intent`: Public endpoint to generate checkout details for Dine-In.
*   `POST /api/v1/public/restaurants/:restaurantSlug/payments/intent`: Public endpoint to generate checkout details for sessionless Delivery/Takeaway.
*   `POST /api/v1/webhooks/razorpay`: Webhook listener for async capture verification. Rate limited with IP-based invalid-signature blocking.
*   `POST /api/v1/webhooks/petpooja`: Webhook listener for inbound order status updates from Petpooja POS.

### Kitchen Display System (Phase 11)
*   `GET /api/v1/restaurants/:restaurantId/kds/tickets` - Retrieve active kitchen prep tickets (Staff/Manager/Super Admin, `kds` flag required). Supports `category` & `orderMode` query params.
*   `PATCH /api/v1/restaurants/:restaurantId/kds/tickets/:orderId/items/:itemIndex/status` - Advance item-level preparation status (Staff/Manager/Super Admin, `kds` flag required).
*   `POST /api/v1/restaurants/:restaurantId/kds/tickets/:orderId/bump` - Bump/resolve entire kitchen ticket (Staff/Manager/Super Admin, `kds` flag required).

### Inventory Management (Phase 12)
*   `PATCH /api/v1/restaurants/:restaurantId/menu-items/:itemId/availability` - Toggle 86'd binary item availability status (Staff/Manager/Super Admin, `inventory` flag required).
*   `PATCH /api/v1/restaurants/:restaurantId/menu-items/:itemId/stock` - Adjust stock tracking, quantity, and low stock threshold (Manager/Super Admin, `inventory` flag required).

### Analytics & Reporting (Phase 13)
*   `GET /api/v1/restaurants/:restaurantId/analytics/summary` - Retrieve revenue summary, paid/cancelled order counts, AOV, mode & source breakdowns for a date range (Manager/Super Admin, `analytics` flag required).
*   `GET /api/v1/restaurants/:restaurantId/analytics/top-items` - Retrieve top-selling menu items by quantity or revenue with item availability badges (Manager/Super Admin, `analytics` flag required).
*   `GET /api/v1/restaurants/:restaurantId/analytics/peak-hours` - Retrieve hourly and daily order volume distribution in restaurant local timezone (Manager/Super Admin, `analytics` flag required).
*   `GET /api/v1/restaurants/:restaurantId/analytics` - Composite analytics overview payload for Manager Dashboard UI (Manager/Super Admin, `analytics` flag required).

### White Label Capabilities (Phase 14)
*   `GET /api/v1/restaurants/:restaurantId/white-label` - Retrieve tenant white label configuration (Manager/Super Admin, `white_label` flag required).
*   `PATCH /api/v1/restaurants/:restaurantId/white-label` - Update colors, fonts, logo, favicon, custom domain, and powered-by badge visibility (Manager/Super Admin, `white_label` flag required).
*   `GET /api/v1/public/white-label/domain/:domain` - Resolve active tenant and public branding configuration by custom domain hostname (Public).

### Plugin Framework - Public OpenAPI & Webhooks (Phase 15)
*   `GET /api/v1/openapi/menu` - Fetch catalog menu categories and items (X-API-Key with `menu:read` scope).
*   `GET /api/v1/openapi/orders` - Fetch tenant orders with status & date filters (X-API-Key with `orders:read` scope).
*   `POST /api/v1/openapi/orders` - Place external order via API (X-API-Key with `orders:write` scope).
*   `GET /api/v1/openapi/webhooks` - List active webhook subscriptions (X-API-Key with `webhooks:manage` scope).
*   `POST /api/v1/openapi/webhooks` - Register new webhook target URL (X-API-Key with `webhooks:manage` scope).
*   `DELETE /api/v1/openapi/webhooks/:webhookId` - Delete webhook subscription (X-API-Key with `webhooks:manage` scope).
*   `GET /api/v1/restaurants/:restaurantId/developer/api-keys` - List API keys (Manager/Super Admin, `api_webhooks` flag required).
*   `POST /api/v1/restaurants/:restaurantId/developer/api-keys` - Create API key (Manager/Super Admin, `api_webhooks` flag required).
*   `DELETE /api/v1/restaurants/:restaurantId/developer/api-keys/:keyId` - Revoke API key (Manager/Super Admin, `api_webhooks` flag required).
*   `POST /api/v1/restaurants/:restaurantId/developer/webhooks/:webhookId/test` - Trigger test ping webhook (Manager/Super Admin, `api_webhooks` flag required).
