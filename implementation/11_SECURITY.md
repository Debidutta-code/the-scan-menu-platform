# Security Architecture

Security is a primary concern for TheScanMenu, particularly given its multi-tenant nature and the handling of financial (order) data.

## 1. Authentication & Session Management
*   **JWT & HttpOnly Cookies**: (Detailed in `06_AUTHORIZATION.md`). Protects against XSS (by hiding the refresh token) and mitigates CSRF (by requiring the access token in headers).
*   **Token Rotation**: Refresh tokens are rotated on every use. If a reused (stolen) refresh token is detected, the entire session chain can be invalidated.
*   **Bcrypt**: Passwords are hashed with bcrypt before storage.

## 2. API Protection
*   **Helmet.js**: Injected into the Express pipeline to set secure HTTP headers (e.g., HSTS, X-Content-Type-Options, X-Frame-Options).
*   **CORS**: Configured strictly to only accept requests from the designated `CLIENT_URL`.
*   **Rate Limiting**: `express-rate-limit` is utilized heavily.
    *   Global API limits protect against general scraping.
    *   Strict limits on public endpoints (`/orders`, `/waiter-call`) prevent abuse and DoS attacks from anonymous QR scans.

## 3. Data Isolation & Authorization
*   **Multi-Tenant Middleware**: `requireRestaurantAccess` ensures horizontal authorization—a user from Restaurant A cannot query orders or menus for Restaurant B, even with a valid JWT.
*   **Role-Based Access**: Vertical authorization (`requireRole`) ensures STAFF cannot access MANAGER settings.
*   **MongoDB Injection Prevention**: Using Mongoose ODMs with typed schemas, combined with Zod payload validation, neutralizes NoSQL injection vectors.

## 4. WebSocket Security
*   **CORS**: Socket.IO is configured with the same strict CORS origins as the REST API.
*   **Room Validation**: When a client requests to join a specific room (e.g., an order tracking room), the backend validates that the requested entity actually exists (`Order.exists`) before allowing the subscription, preventing arbitrary data snooping.

## 5. Error Handling
*   **Trace Masking**: The global error handler catches unhandled exceptions. In production (`NODE_ENV=production`), it masks internal stack traces and genericizes error messages to prevent leaking database schemas or file paths.
