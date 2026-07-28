# Architecture

TheScanMenu is built as a modern, decoupled Full-Stack application organized in a Monorepo.

## 1. High-Level Architecture

The system consists of three primary layers:
1.  **Client (Frontend)**: A Single Page Application (SPA) providing the user interfaces for customers, staff, managers, and super admins.
2.  **Server (Backend)**: A RESTful API serving as the business logic and data access layer, supplemented by WebSockets for real-time communication.
3.  **Database**: A NoSQL document database storing all persistent state.

## 2. Monorepo Structure

The project utilizes npm workspaces to manage the codebase in a single repository:

*   `/client`: The Vite-powered frontend application.
*   `/server`: The Node.js/Express backend application.
*   `/docs`: Core technical documentation and design tokens.
*   `/implementation`: Future roadmap and architectural guidelines.

This structure allows for unified dependency management, shared linting rules, and cohesive full-stack development commands (e.g., `npm run build`, `npm run test` from the root).

## 3. Technology Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand (State), React Query (Data Fetching), React Router, Framer Motion (Animations).
*   **Backend**: Node.js, Express, TypeScript, Mongoose (ODM), Socket.IO (WebSockets), Zod (Validation), JSON Web Tokens (Auth).
*   **Database**: MongoDB.

## 4. Deployment Model (Target)

The decoupled nature of the application supports independent deployment of the frontend and backend:

*   **Client**: Can be deployed to static hosting providers or Edge networks like Vercel, Netlify, or AWS S3/CloudFront. The build process generates static HTML/JS/CSS assets.
*   **Server**: Should be deployed to a Node.js runtime environment (e.g., AWS ECS, Render, Heroku, or a VPS). It requires environment variables to connect to the database and external services.
*   **Database**: A managed MongoDB cluster (e.g., MongoDB Atlas) is recommended for production.

## 5. Real-time Architecture

Real-time capabilities are crucial for operational dashboards (e.g., order tracking, waiter calls).

*   **Socket.IO**: Used to establish persistent, bi-directional communication channels.
*   **Rooms/Namespaces**: Connections are scoped into rooms based on `restaurantId` or specific `tableTokens`/`sessionIds` to ensure events are only broadcast to authorized and relevant clients.
*   **Events**: The backend emits events (e.g., `order:status_updated`, `waiter_call:created`) when state changes occur via REST API calls. The frontend listens for these events to update UI state optimistically or trigger refetches.

## 6. Environment Configuration

The backend relies on strict environment variable configuration to operate securely:

*   `NODE_ENV`: Defines the runtime environment (development, test, production).
*   `MONGODB_URI`: Connection string for the database.
*   `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: Cryptographic keys for signing tokens.
*   `PORT`: The port the Express server binds to.
*   `CLIENT_URL`: Configures CORS and WebSocket origins.

The server implements a "fail-fast" strategy, terminating immediately on startup if critical variables are missing.
