# Multi-Tenant Architecture

TheScanMenu is designed from the ground up as a multi-tenant SaaS platform. A single instance of the application and database serves multiple independent restaurants (tenants).

## Data Isolation Strategy

We employ a **Logical Isolation (Shared Database, Shared Schema)** approach.

*   All tenants share the same MongoDB database and the same collections.
*   Data separation is enforced at the application level.

### The `restaurantId` Key
Almost every operational model in the database (`Category`, `MenuItem`, `Order`, `Table`, `WaiterCall`) contains a mandatory `restaurantId` field referencing the `Restaurant` model.

### Enforcing Isolation
Isolation is guaranteed through a combination of middleware and service-layer design:

1.  **Middleware Guard (`requireRestaurantAccess`)**: As detailed in `06_AUTHORIZATION.md`, all tenant-specific API routes are prefixed with `/restaurants/:restaurantId`. The middleware verifies the user has rights to this ID before the controller is even invoked.
2.  **Service Queries**: Within the service layer, **every** database query (find, update, delete) must explicitly include the `restaurantId` in its filter criteria.
    *   *Bad*: `Order.findById(orderId)`
    *   *Good*: `Order.findOne({ _id: orderId, restaurantId: context.restaurantId })`
3.  **Creation Integrity**: When creating new entities, the service layer forces the `restaurantId` from the authenticated context, ignoring any tenant IDs provided in the request body to prevent spoofing.

## Tenant Configuration

The `Restaurant` model acts as the configuration hub for a tenant. It dictates how the platform behaves for that specific restaurant:

*   **Branding**: `theme` (colors, fonts, logos) is applied dynamically on the frontend.
*   **Operations**: Configurable workflows (e.g., 3-step vs 5-step order processing).
*   **Integrations**: The `integrationConfig` field determines which POS adapter is instantiated for this tenant.

## Public Routing

Public-facing routes (customer QR scans) resolve tenants using a unique, URL-friendly `slug` rather than an ObjectId, ensuring clean URLs (e.g., `thescanmenu.com/p/demo-cafe/table/xyz`). The public controller resolves the slug to a `restaurantId` internally before querying data.
