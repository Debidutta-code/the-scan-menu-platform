# AUTH.md - Authentication & Authorization API Specification

The platform utilizes a secure JWT-based stateless session strategy with short-lived access tokens and longer-lived `HttpOnly` Secure cookies for refresh tokens.

## Base URL
`/api/v1/auth`

---

## Endpoints

### 1. Login User
Authenticates a user and issues token pairs.

- **Method:** `POST`
- **Path:** `/login`
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
- **Path:** `/refresh`
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
- **Path:** `/logout`
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
Fetches the profile of the currently authenticated session.

- **Method:** `GET`
- **Path:** `/me`
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
Changes password for the currently logged-in user.

- **Method:** `POST`
- **Path:** `/change-password`
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

## Phase 8 Ordering Mode Endpoints

### 6. Create Sessionless Order (Public Customer - Takeaway / Delivery)
- **Method:** `POST`
- **Path:** `/api/v1/public/restaurants/:restaurantSlug/orders`
- **Auth:** Public (Rate-limited)
- **Request Body (JSON):**
  ```json
  {
    "orderMode": "TAKEAWAY",
    "customerName": "John Doe",
    "customerPhone": "9876543210",
    "deliveryAddress": { "street": "123 Main St", "city": "Metropolis" },
    "items": [{ "itemId": "60d0fe...", "quantity": 1 }]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "_id": "...", "orderMode": "TAKEAWAY", "orderNumber": 101 },
    "message": "Order placed successfully"
  }
  ```

### 7. Create Counter Order (Staff / Manager)
- **Method:** `POST`
- **Path:** `/api/v1/restaurants/:restaurantId/orders/counter`
- **Auth:** Required (`MANAGER`, `STAFF`)
- **Request Body (JSON):**
  ```json
  {
    "customerName": "Walk-in Customer",
    "paymentStatus": "PAID",
    "items": [{ "itemId": "60d0fe...", "quantity": 2 }]
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "_id": "...", "orderMode": "COUNTER", "paymentStatus": "PAID" },
    "message": "Counter order created successfully"
  }
  ```

### 8. Create Sessionless Payment Intent (Public Customer)
- **Method:** `POST`
- **Path:** `/api/v1/public/restaurants/:restaurantSlug/payments/intent`
- **Auth:** Public
- **Request Body (JSON):**
  ```json
  {
    "amount": 1500,
    "currency": "INR",
    "metadata": { "orderId": "60d0fe..." }
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "transactionId": "...", "providerReferenceId": "order_xyz", "razorpayKeyId": "rzp_test_..." },
    "message": "Payment intent created successfully"
  }
  ```

---

### 9. View Integration Sync Logs (Manager / Super Admin)
- **Method:** `GET`
- **Path:** `/api/v1/restaurants/:restaurantId/integrations/sync-logs`
- **Auth:** Bearer Token (Roles: `MANAGER`, `SUPER_ADMIN`). Feature flag required: `pos_integration`.
- **Query Params:** `page` (optional), `limit` (optional), `status` (optional: `PENDING` | `SUCCESS` | `FAILED`)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "_id": "60d0fe...",
          "restaurantId": "60d0fe...",
          "orderId": "60d0fe...",
          "provider": "NONE",
          "operation": "PUSH_ORDER",
          "status": "SUCCESS",
          "syncAttempts": 1,
          "createdAt": "2026-08-03T17:20:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
### 10. KDS - Get Bumped Tickets History (Staff / Manager / Super Admin)
- **Method:** `GET`
- **Path:** `/api/v1/restaurants/:restaurantId/kds/history`
- **Auth:** Bearer Token (Roles: `STAFF`, `MANAGER`, `SUPER_ADMIN`). Feature flag required: `kds`.
- **Query Params:** `limit` (optional, default 25)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "60d0fe...",
        "orderNumber": 101,
        "status": "SERVED",
        "items": [...]
      }
    ],
    "message": "Bumped KDS tickets history retrieved successfully"
  }
  ```

---

### 11. KDS - Recall Bumped Ticket (Staff / Manager / Super Admin)
- **Method:** `POST`
- **Path:** `/api/v1/restaurants/:restaurantId/kds/tickets/:orderId/recall`
- **Auth:** Bearer Token (Roles: `STAFF`, `MANAGER`, `SUPER_ADMIN`). Feature flag required: `kds`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "60d0fe...",
      "orderNumber": 101,
---

## Customer Authentication & Management Endpoints

### 12. Send Customer Login OTP
- **Method:** `POST`
- **Path:** `/api/v1/public/customers/send-otp`
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
      "phone": "9876543210",
      "isExistingUser": true,
      "customerName": "Alice",
      "demoOtp": "1234"
    },
    "message": "Verification code sent successfully"
  }
  ```

---

### 13. Verify Customer OTP & Login
- **Method:** `POST`
- **Path:** `/api/v1/public/customers/verify-otp`
- **Request Body (JSON):**
  ```json
  {
    "phone": "9876543210",
    "otp": "1234",
    "name": "Alice",
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
        "name": "Alice",
        "phone": "9876543210",
        "totalOrdersCount": 3,
        "totalSpent": 15000
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

---

### 14. Get Current Customer Profile
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
        "_id": "60d0fe...",
        "name": "Alice",
        "phone": "9876543210",
        "totalOrdersCount": 3,
        "totalSpent": 15000
      }
    },
    "message": "Customer profile retrieved successfully"
  }
  ```

---

### 15. Get Customer Order History
- **Method:** `GET`
- **Path:** `/api/v1/public/customers/orders`
- **Request Headers:**
  - `Authorization`: `Bearer <customerToken>`
- **Query Params:** `page` (optional), `limit` (optional)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "orders": [...],
      "pagination": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
    },
    "message": "Customer order history retrieved successfully"
  }
  ```

---

### 16. Manager Customer Directory
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



