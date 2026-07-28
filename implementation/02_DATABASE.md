# Database Architecture

TheScanMenu utilizes MongoDB as its primary data store, using Mongoose as the Object Data Modeling (ODM) layer.

## Philosophy

The schema is designed to balance normalization (for data integrity) and denormalization (for read performance).
*   **References**: Entities generally reference each other via `ObjectId` to maintain a single source of truth.
*   **Tenant Isolation**: Almost every collection includes a `restaurantId` to enforce multi-tenancy and allow for efficient indexing.
*   **Soft Deletion**: Entities like tables and menu items use an `isArchived` flag rather than hard deletion to preserve historical data integrity (e.g., past orders referencing a deleted item).

## Core Models

### 1. Identity & Auth
*   **`User`**: Represents individuals (Super Admins, Managers, Staff) with credentials, roles, and basic profile data.
*   **`RefreshToken`**: Stores long-lived tokens for session rotation, linked to a `UserId`.
*   **`RestaurantStaff`**: A linking model associating a `User` with a specific `Restaurant` and defining their operational role within that tenant.

### 2. Tenant & Configuration
*   **`Restaurant`**: The core tenant entity. Stores business details, branding (theme colors, fonts), operational configuration (timings, workflows), and subscription metadata.
*   **`Tax`**: Defines tax rates and types (e.g., GST) applicable to a specific restaurant.

### 3. Menu System
*   **`Category`**: Logical groupings of menu items (e.g., "Starters", "Mains"). Includes `sortOrder` for display logic.
*   **`MenuItem`**: Individual items available for order. Contains pricing, dietary tags, descriptions, image URLs, and availability flags. Linked to a `Category` and `Restaurant`.

### 4. Tables & Sessions
*   **`TableZone`**: Areas within a restaurant (e.g., "Patio", "Main Hall").
*   **`Table`**: Specific seating locations. Crucially, stores a unique `tableToken` (nanoid) used for public QR code routing and security. Linked to a `TableZone`.
*   **`TableSession`**: Represents a distinct customer visit to a table. Groups multiple orders together for a single bill. Tracks state (`OPEN`, `CLOSED`).

### 5. Operations
*   **`Order`**: A customer purchase instance (a round of ordering). Contains an array of `items` (snapshots of MenuItems at the time of purchase), pricing totals, customer details, and a state machine status (`PENDING` -> `SERVED`). Linked to a `TableSession` and `Table`.
*   **`OrderCounter`**: A utility model used to generate sequential, human-readable order numbers atomically per restaurant.
*   **`WaiterCall`**: Customer requests for assistance. Tracks the type of request, location (`Table`), and resolution status.
*   **`IntegrationSyncLog`**: Tracks the status and payloads of asynchronous communications with external POS/integration partners.

## Indexing Strategy
To ensure performance as the platform scales, collections heavily index on `restaurantId` combined with relevant filtering or sorting fields (e.g., `[restaurantId, createdAt]`, `[restaurantId, isActive]`). Unique indexes are used strictly where appropriate (e.g., `email` on Users, `tableToken` on Tables).
