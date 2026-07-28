# Performance Architecture

The platform is designed to handle high concurrency, especially during peak restaurant hours where multiple tables are ordering and requesting assistance simultaneously.

## Frontend Performance

### 1. Build Optimization
*   **Vite**: The build process uses Vite (esbuild/Rollup) to heavily minify and chunk code, ensuring fast time-to-interactive for public users on mobile networks.
*   **Asset Loading**: SVGs and images are optimized. The public menu loads categories and items efficiently, displaying placeholders while images load.

### 2. State & Rendering Strategy
*   **Zustand**: Client-side cart state uses Zustand, which avoids wrapping the entire React tree in Context providers, thereby reducing unnecessary re-renders when the cart updates.
*   **Timer Throttling**: Elapsed times on order cards (e.g., "Waiting 5m") use a dual-speed clock mechanism. They tick every 30 seconds on list views to save CPU cycles, and accelerate to 10 seconds only when a specific detail modal is focused.

## Backend Performance

### 1. Database Indexing
The most critical performance layer is MongoDB indexing.
*   Compound indexes are heavily utilized. E.g., querying orders requires sorting by time. The index `{ restaurantId: 1, createdAt: -1 }` ensures that filtering by tenant and sorting by newest is highly efficient.

### 2. Analytical Queries
*   The `/analytics` endpoints utilize native MongoDB Aggregation pipelines. This pushes the computation of revenue summaries, top-selling items, and time-series bucketing down to the database layer, which is highly optimized for these operations, rather than calculating them in Node.js memory.

### 3. Stateless API
*   By using JWTs and offloading session state to the client, the Express servers remain stateless. This allows for horizontal scaling (adding more instances) behind a load balancer without worrying about sticky sessions.

### 4. Payload Optimization
*   Public menu endpoints (`/api/v1/public/.../menu`) return a pre-sorted, nested payload (Categories containing arrays of MenuItems). This allows the frontend to render the menu immediately without doing complex array grouping on the client device.
