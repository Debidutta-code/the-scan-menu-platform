# Frontend Architecture

The frontend of TheScanMenu is a Single Page Application (SPA) built to deliver a highly responsive, app-like experience for both public customers and restaurant staff.

## Technology Stack
*   **Build Tool**: Vite (for fast HMR and optimized builds).
*   **Framework**: React 18+ with TypeScript.
*   **Styling**: Tailwind CSS for utility-first styling.
*   **Routing**: React Router (DOM) for client-side navigation.
*   **State Management**:
    *   `Zustand`: Used for complex, session-persistent state (e.g., the customer cart, UI toggles).
    *   `React Query` (TanStack Query): Expected to be used for server state management (caching, deduping API requests, optimistic updates).
*   **Animations**: Framer Motion for fluid micro-interactions and layout transitions.
*   **Forms**: React Hook Form combined with Zod for robust, typed client-side validation.

## Architectural Patterns

### 1. View Separation
The application logic is sharply divided between two distinct user experiences:
*   **Public Views (`/public/*`)**: Mobile-first interfaces designed for customers scanning QR codes. Focuses on menu browsing, cart management, and order tracking. These views do not require authentication but rely on URL parameters (`:restaurantSlug`, `:tableToken`) for context.
*   **Administrative Views (`/manager/*`, `/admin/*`)**: Desktop and tablet-optimized dashboards for staff and platform owners. Protected by authentication and role-based routing.

### 2. Layouts
Consistent structural components wrap routing layers:
*   `ManagerLayout`: Provides the sidebar/bottom-bar navigation, notification badges, and WebSocket connection contexts for staff.
*   `PublicLayout`: Manages the simplified mobile navigation, sticky cart interfaces, and theme injection.

### 3. State & Persistence
*   **Customer Cart**: Managed via `useCartStore` (Zustand) and persisted in `sessionStorage` to survive accidental page reloads during the ordering process, but clearing when the browser session ends.
*   **Auth State**: Managed by a custom `useAuth` hook, handling token presence, silent refreshes, and exposing the current user profile.

### 4. Design System Implementation
*   **Tailwind Config**: The `tailwind.config.js` acts as the source of truth for the design system. It defines custom typography (Instrument Serif, Plus Jakarta Sans), color palettes, and specific animation utilities.
*   **Component Library**: Common UI elements (buttons, inputs, modals, toasts) are abstracted into reusable components within `src/components/`, ensuring visual consistency and preventing code duplication.
*   **Custom Utilities**: `index.css` contains specialized classes like `.no-scrollbar` to handle cross-browser layout quirks.

### 5. WebSocket Integration
The client uses a custom `useSocket` hook to manage the Socket.IO lifecycle. It connects on authentication (or when joining a public table session) and listens for relevant events to update dashboard counters, refresh Kanban boards, or update customer order tracking screens in real-time.
