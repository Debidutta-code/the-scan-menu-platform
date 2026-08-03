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
*   `GET /stats`: Platform-wide metrics.

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
*   `/staff`: Managing staff access to the tenant. (Requires MANAGER).
*   `/analytics`: Reporting and metrics endpoints. (Requires MANAGER).

## Security & Validation
*   Incoming request payloads (body, query params) are validated against Zod schemas in the route definitions before reaching controllers.
*   Public endpoints have stricter rate-limiting configurations applied to prevent abuse (e.g., order creation).

### Payments (Phase 6, 7 & 8)
*   `POST /api/v1/restaurants/:restaurantId/payments/intent` - Create a payment intent (Manager/Staff/Public)
*   `GET /api/v1/restaurants/:restaurantId/payments/transactions` - List transactions
*   `GET /api/v1/restaurants/:restaurantId/payments/transactions/:id` - Get transaction details
*   `PATCH /api/v1/restaurants/:restaurantId/payments/config` - Update active payment provider and mode (Manager/Super Admin)
*   `POST /api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/payments/intent`: Public endpoint to generate checkout details for Dine-In.
*   `POST /api/v1/public/restaurants/:restaurantSlug/payments/intent`: Public endpoint to generate checkout details for sessionless Delivery/Takeaway.
*   `POST /api/v1/webhooks/razorpay`: Webhook listener for async capture verification. Rate limited with IP-based invalid-signature blocking.
