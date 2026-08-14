# Authentication & Authorization

TheScanMenu employs a robust, stateless authentication system combined with granular, role-based, and tenant-based authorization.

## Authentication Flow

The system uses a two-token architecture (Access + Refresh) to balance security and user experience.

1.  **Login**: The user provides credentials (`/api/v1/auth/login`). Upon success, the server generates:
    *   **Access Token**: A short-lived (e.g., 15m) JWT sent in the JSON response body.
    *   **Refresh Token**: A long-lived (e.g., 7d) opaque token stored in the database (`RefreshToken` model) and sent to the client as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie.
2.  **API Requests**: The client attaches the Access Token to the `Authorization: Bearer <token>` header for protected routes.
3.  **Token Refresh**: When the Access Token expires, the client calls `/api/v1/auth/refresh`. The browser automatically sends the `HttpOnly` Refresh Token cookie. If valid, the server rotates the Refresh Token (issuing a new cookie) and returns a new Access Token.
4.  **Logout**: The client calls `/api/v1/auth/logout`. The server revokes the Refresh Token in the database and clears the cookie.

This approach protects against Cross-Site Scripting (XSS) attacks stealing long-lived credentials, while still allowing the client application to read the short-lived access token for API usage.

## Authorization Levels

Authorization is enforced via Express middleware chains.

### 1. Identity (`requireAuth`)
Ensures the request has a valid, unexpired Access Token. It decodes the token and attaches the basic `user` payload to the Express Request object (`req.user`).

### 2. Global Role (`requireRole`)
Restricts access based on the user's platform-level role.
*   `requireRole(['SUPER_ADMIN'])`: Only platform owners can access.

### 3. Tenant Access (`requireRestaurantAccess`)
This is the most critical authorization layer for a multi-tenant system. It ensures that a user can only access data belonging to a specific restaurant they are employed by.

*   **Mechanism**: The middleware extracts `restaurantId` from the route parameters (e.g., `/api/v1/restaurants/:restaurantId/...`).
*   **Validation**: It queries the `RestaurantStaff` collection to verify an active link exists between `req.user.id` and the `restaurantId`.
*   **Context Injection**: If successful, it attaches the specific staff relationship (including their role within that specific restaurant, e.g., MANAGER or STAFF) to the request (`req.staffContext`).
*   **Role Gating**: The middleware also accepts an optional array of allowed roles. For instance, `requireRestaurantAccess(['MANAGER'])` ensures not only that the user works there, but also that they have managerial privileges for that specific tenant.
