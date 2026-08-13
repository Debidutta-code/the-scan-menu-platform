# AUTH.md - Authentication & Authorization API Specification

The platform utilizes a secure JWT-based stateless session strategy with short-lived access tokens and longer-lived `HttpOnly` Secure cookies for refresh tokens. Customer sessions use tenant-scoped customer JWTs.

## Base URL
`/api/v1`

---

## Staff & Super Admin Authentication

### 1. Login User
Authenticates a staff/manager/admin user and issues token pairs.

- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Request Body (JSON):**
  ```json
  {
    "email": "admin@pixora.dev",
    "password": "PixoraDemo123!"
  }
  ```
- **Response Headers:**
  - `Set-Cookie`: `refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "60d0fe23...",
        "email": "admin@pixora.dev",
        "name": "Super Admin",
        "role": "SUPER_ADMIN",
        "isActive": true
      }
    },
    "message": "Login successful"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Invalid payload format)
  - `401 Unauthorized` (Invalid email or password)

---

### 2. Refresh Access Token
Uses the refresh token from `HttpOnly` cookies to issue a new short-lived access token.

- **Method:** `POST`
- **Path:** `/api/v1/auth/refresh`
- **Request Headers / Cookies:**
  - Cookie: `refreshToken=<token>`
- **Response Headers:** (Includes rotated refresh token)
  - `Set-Cookie`: `refreshToken=<new-token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi..."
    },
    "message": "Token refreshed successfully"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` (Missing, expired, or invalid/revoked refresh token)

---

### 3. Logout User
Revokes the refresh token and clears the authentication cookies.

- **Method:** `POST`
- **Path:** `/api/v1/auth/logout`
- **Request Headers / Cookies:**
  - Cookie: `refreshToken=<token>`
- **Response Headers:**
  - `Set-Cookie`: `refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {},
    "message": "Logged out successfully"
  }
  ```

---

### 4. Get Current User Details
Fetches the profile of the currently authenticated staff/admin session.

- **Method:** `GET`
- **Path:** `/api/v1/auth/me`
- **Request Headers:**
  - `Authorization`: `Bearer <accessToken>`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "60d0fe23...",
        "email": "admin@pixora.dev",
        "name": "Super Admin",
        "role": "SUPER_ADMIN",
        "isActive": true
      }
    },
    "message": "User details fetched successfully"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` (Missing or expired access token)

---

### 5. Change Password
Changes password for the currently logged-in staff/admin user.

- **Method:** `POST`
- **Path:** `/api/v1/auth/change-password`
- **Request Headers:**
  - `Authorization`: `Bearer <accessToken>`
- **Request Body (JSON):**
  ```json
  {
    "currentPassword": "PixoraDemo123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {},
    "message": "Password changed successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Invalid criteria or format)
  - `401 Unauthorized` (Invalid current password or token expired)

---

## Phase 1 Customer Identity & OTP Endpoints

### 6. Send Customer Login OTP
Generates a cryptographically secure 6-digit OTP with a 5-minute expiry, 60-second resend cooldown, and strict Indian phone normalization (`+91XXXXXXXXXX`). Prevents user enumeration by never exposing whether the account exists.

- **Method:** `POST`
- **Path:** `/api/v1/public/customers/send-otp`
- **Rate Limit:** 3 requests per 10 minutes per IP
- **Request Body (JSON):**
  ```json
  {
    "phone": "9876543210",
    "restaurantSlug": "demo-cafe"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "phone": "+919876543210",
      "expiresInSeconds": 300,
      "cooldownSeconds": 60
    },
    "message": "Verification code sent successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (`INVALID_PHONE`: Must be a valid 10-digit Indian mobile number)
  - `429 Too Many Requests` (`OTP_COOLDOWN`: Please wait 60 seconds before requesting another code)

---

### 7. Verify Customer OTP & Login
Validates 6-digit OTP in constant time (`timingSafeEqual`), limits attempts to 5 max, and marks the OTP as single-use. Customer profiles are only created/updated after successful verification.

- **Method:** `POST`
- **Path:** `/api/v1/public/customers/verify-otp`
- **Rate Limit:** 5 verification attempts per 10 minutes per IP
- **Request Body (JSON):**
  ```json
  {
    "phone": "9876543210",
    "otp": "847291",
    "name": "Alice Sharma",
    "restaurantSlug": "demo-cafe"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "customer": {
        "id": "60d0fe...",
        "name": "Alice Sharma",
        "phone": "+919876543210",
        "totalOrdersCount": 0,
        "totalSpent": 0
      },
      "customerToken": "eyJhbGciOi...",
      "restaurant": {
        "id": "60d0fe...",
        "name": "Demo Cafe",
        "slug": "demo-cafe"
      }
    },
    "message": "Customer verified and logged in successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (`INVALID_OTP`, `OTP_MAX_ATTEMPTS_EXCEEDED`, `INVALID_OR_EXPIRED_OTP`)
  - `403 Forbidden` (`FORBIDDEN`: Blocked customer account)

---

### 8. Get Authenticated Customer Profile
Returns the authenticated customer's own profile. Customer tokens are strictly verified against the host restaurant tenant.

- **Method:** `GET`
- **Path:** `/api/v1/public/customers/me`
- **Request Headers:**
  - `Authorization`: `Bearer <customerToken>`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "customer": {
        "id": "60d0fe...",
        "name": "Alice Sharma",
        "phone": "+919876543210",
        "totalOrdersCount": 3,
        "totalSpent": 150000
      }
    },
    "message": "Customer profile retrieved successfully"
  }
  ```
- **Error Responses:**
  - `401 Unauthorized` (Missing, invalid, or expired token)
  - `403 Forbidden` (Token from another restaurant used on this tenant)

---

### 9. Update Authenticated Customer Profile
- **Method:** `PATCH`
- **Path:** `/api/v1/public/customers/profile`
- **Request Headers:**
  - `Authorization`: `Bearer <customerToken>`
- **Request Body (JSON):**
  ```json
  {
    "name": "Alice S.",
    "email": "alice@example.com"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60d0fe...",
      "name": "Alice S.",
      "phone": "+919876543210",
      "email": "alice@example.com"
    },
    "message": "Profile updated successfully"
  }
  ```

---

### 10. Get Customer Order History
- **Method:** `GET`
- **Path:** `/api/v1/public/customers/orders`
- **Request Headers:**
  - `Authorization`: `Bearer <customerToken>`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "orders": [
        {
          "id": "60d0fe...",
          "orderNumber": 101,
          "roundNumber": 1,
          "orderMode": "DINE_IN",
          "customerName": "Alice S.",
          "status": "SERVED",
          "items": [...],
          "subtotal": 35000,
          "tax": 1750,
          "total": 36750,
          "createdAt": "2026-08-12T17:00:00.000Z"
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
    },
    "message": "Customer order history retrieved successfully"
  }
  ```

---

## Phase 1 Hardened Public Table & Shared Dining Endpoints

### 11. Resolve Physical Table Context
Resolves table metadata, branding, and active meal status. Table tokens use 24 bytes of entropy (non-enumerable).

- **Method:** `GET`
- **Paths:**
  - Subdomain: `/api/v1/public/table/:tableToken`
  - Legacy Path: `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "restaurant": { "id": "...", "name": "Spice Garden", "slug": "spice-garden", ... },
      "table": { "id": "...", "displayName": "Table 12", "token": "..." },
      "status": "ACTIVE_SESSION"
    },
    "message": "Table resolved successfully"
  }
  ```

---

### 12. Get Shared Dining Session & Table Orders
Enables all diners seated at the same table to view all orders/rounds placed during the active `DiningSession`. Other diners' phone numbers are strictly redacted.

- **Method:** `GET`
- **Paths:**
  - Subdomain: `/api/v1/public/table/:tableToken/session`
  - Legacy Path: `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/session`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60d0fe...",
      "sessionCode": "S-4821",
      "status": "ACTIVE",
      "paymentMode": "POSTPAID",
      "roundCount": 2,
      "subtotal": 70000,
      "tax": 3500,
      "total": 73500,
      "balanceDue": 73500,
      "orders": [
        {
          "id": "...",
          "orderNumber": 101,
          "roundNumber": 1,
          "customerName": "Alice",
          "status": "SERVED",
          "items": [...]
        }
      ]
    },
    "message": "Session retrieved successfully"
  }
  ```

---

### 13. Idempotent Postpaid Order Placement
Places an order ticket within the table's active dining session. Supports concurrency locking via `Idempotency-Key` to eliminate duplicate charges/inventory deductions from rapid double-clicks.

- **Method:** `POST`
- **Paths:**
  - Subdomain: `/api/v1/public/table/:tableToken/orders`
  - Legacy Path: `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/orders`
- **Headers:**
  - `Idempotency-Key`: `<uuid-or-unique-string>` (Optional but recommended)
  - `Authorization`: `Bearer <customerToken>` (Optional - auto-links profile)
- **Request Body (JSON):**
  ```json
  {
    "items": [{ "itemId": "60d0fe...", "quantity": 2 }],
    "customerName": "Alice",
    "customerPhone": "9876543210",
    "customerNote": "Extra spicy"
  }
  ```
- **Success Response (201 Created / 200 OK on Idempotent replay):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60d0fe...",
      "orderNumber": 102,
      "roundNumber": 2,
      "orderMode": "DINE_IN",
      "customerName": "Alice",
      "status": "PENDING",
      "items": [...],
      "subtotal": 50000,
      "tax": 2500,
      "total": 52500
    },
    "message": "Order placed successfully"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (`ITEMS_UNAVAILABLE`: Out-of-stock items)
  - `409 Conflict` (`IDEMPOTENCY_CONFLICT`: Reused key with different payload, `ORDER_IN_PROGRESS`: Order is actively processing)

---

### 14. Scoped Order Lookup
Returns order status and item details scoped to the verified table context and tenant.

- **Method:** `GET`
- **Paths:**
  - Subdomain: `/api/v1/public/table/:tableToken/orders/:orderId`
  - Legacy Path: `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/orders/:orderId`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60d0fe...",
      "orderNumber": 102,
      "roundNumber": 2,
      "status": "PREPARING",
      "items": [...]
    },
    "message": "Order retrieved successfully"
  }
  ```
- **Error Responses:**
  - `404 Not Found` (Order not found or belongs to another restaurant/table)

---

### 15. Manager Customer Directory
- **Method:** `GET`
- **Path:** `/api/v1/restaurants/:restaurantId/customers`
- **Auth:** Bearer Token (Roles: `MANAGER`, `SUPER_ADMIN`)
- **Query Params:** `search` (optional), `page` (optional), `limit` (optional)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "customers": [...],
      "pagination": { "page": 1, "limit": 50, "total": 12, "totalPages": 1 }
    },
    "message": "Customers retrieved successfully"
  }
  ```

---

### 16. Reopen Table Session (Staff Only)
Reopens a `BILL_REQUESTED` dining session back to `ACTIVE` status. This allows staff to let customers continue ordering after a bill has been requested but before payment is settled.

> **Note:** This endpoint is **staff-only**. The previous public route `POST /api/v1/public/table-sessions/:sessionId/reopen` has been removed for security reasons. Customers can ask staff to reopen a session.

- **Method:** `POST`
- **Path:** `/api/v1/restaurants/:restaurantId/table-sessions/:sessionId/reopen`
- **Auth:** Bearer Token (Roles: `MANAGER`, `STAFF`)
- **Request Body:** None
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "...",
      "status": "ACTIVE",
      ...
    },
    "message": "Session reopened for ordering"
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Session is not in `BILL_REQUESTED` state)
  - `401 Unauthorized` (Missing or invalid token)
  - `403 Forbidden` (Insufficient role)
  - `404 Not Found` (Session not found in restaurant scope)

---

### 17. Clear Tables (Manager / Super Admin)
Clears table status back to `AVAILABLE` and closes any active dining sessions for the specified tables.

- **Method:** `POST`
- **Path:** `/api/v1/restaurants/:restaurantId/tables/clear`
- **Auth:** Bearer Token (Roles: `MANAGER`, `SUPER_ADMIN`)
- **Request Body (JSON):**
  ```json
  {
    "tableIds": ["60d0fe...", "60d0ff..."]
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "clearedCount": 2
    },
    "message": "2 table(s) cleared successfully"
  }
  ```

---

### 18. Reserve Tables (Manager / Super Admin)
Marks single or multiple tables as `RESERVED` (or `AVAILABLE`).

- **Method:** `POST`
- **Path:** `/api/v1/restaurants/:restaurantId/tables/reserve`
- **Auth:** Bearer Token (Roles: `MANAGER`, `SUPER_ADMIN`)
- **Request Body (JSON):**
  ```json
  {
    "tableIds": ["60d0fe..."],
    "reserved": true
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "updatedCount": 1,
      "status": "RESERVED"
    },
    "message": "1 table(s) marked as RESERVED"
  }
  ```

---

### 19. Update Table Status (Manager / Super Admin)
Updates status for a single table (`AVAILABLE`, `OCCUPIED`, `RESERVED`).

- **Method:** `PATCH`
- **Path:** `/api/v1/restaurants/:restaurantId/tables/:tableId/status`
- **Auth:** Bearer Token (Roles: `MANAGER`, `SUPER_ADMIN`)
- **Request Body (JSON):**
  ```json
  {
    "status": "RESERVED"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "60d0fe...",
      "status": "RESERVED"
    },
    "message": "Table status updated to RESERVED"
  }
  ```

