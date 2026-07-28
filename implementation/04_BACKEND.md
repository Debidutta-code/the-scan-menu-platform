# Backend Architecture

The backend of TheScanMenu is a RESTful API server built on Node.js and Express, designed to be stateless (excluding WebSockets), secure, and highly scalable.

## Technology Stack
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Language**: TypeScript
*   **Database ODM**: Mongoose (MongoDB)
*   **Real-time**: Socket.IO
*   **Validation**: Zod (for request payload validation)
*   **Security**: Helmet, CORS, Express Rate Limit, bcrypt, jsonwebtoken.

## Architectural Patterns

The application adheres strictly to a multi-tiered architecture to separate concerns and improve testability:

### 1. Routes (`src/routes/`)
Responsible only for defining the API endpoints and attaching the appropriate middleware chain (authentication, authorization, validation) before passing the request to a controller.

### 2. Controllers (`src/controllers/`)
Act as orchestrators. They receive the HTTP request from the route, extract the necessary data (params, body, user context), call the appropriate Service layer functions, and then format the output using a standardized response envelope (`utils/response.ts`). **No business logic resides here.**

### 3. Services (`src/services/`)
The core of the application. Services contain all the business rules, data transformation, and orchestration between different database models or external providers. Examples include `table.service.ts`, `token.service.ts`, and `email.service.ts`.

### 4. Models (`src/models/`)
Mongoose schemas defining the data structure, validation rules, and indexes. They also include Mongoose middleware (pre/post hooks) for operations that must always happen upon data mutation (e.g., updating an order's aggregate status when an item's status changes).

### 5. Middleware (`src/middleware/`)
Reusable functions that intercept requests:
*   `requireAuth`: Validates JWT access tokens.
*   `requireRole`: Restricts access based on `User.role`.
*   `requireRestaurantAccess`: Crucial multi-tenant guard that ensures the authenticated user is an active staff member of the requested `restaurantId`.
*   `errorHandler`: Catches unhandled exceptions, logs them, and returns a standard error envelope to the client, masking internal details in production.

### 6. Integrations (`src/integrations/`)
An adapter pattern implementation for connecting to external systems (primarily POS like Petpooja or payment gateways). `IntegrationFactory` resolves the correct adapter based on the restaurant's configuration, defaulting to a `NoOpIntegration`.

### 7. Real-time (`src/sockets/`)
A `SocketService` singleton manages the Socket.IO server. It handles authentication handshakes, manages client connections into specific rooms (e.g., `restaurant_123`, `session_456`), and provides methods for the REST API services to broadcast events to these rooms when state changes.
