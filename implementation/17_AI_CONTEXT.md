# AI Context & Principles

This file provides critical context for AI assistants and future developers working on TheScanMenu. Read this before planning or implementing any changes.

## 1. Project Purpose & Business Goals
TheScanMenu is a modular, multi-tenant SaaS platform for restaurants. Its primary goals are to:
1.  Provide a beautiful, mobile-first QR ordering experience for customers without requiring app downloads.
2.  Provide a robust, real-time operational dashboard for restaurant staff.
3.  Act as a bridge to legacy POS systems, not necessarily a replacement for them.

## 2. Core Philosophies

### Multi-Tenant First
*   **Never** write queries or logic that assumes a single restaurant.
*   Every data mutation or read must be strictly scoped to a `restaurantId`. Ensure `requireRestaurantAccess` is used on all tenant routes.

### POS Decoupling (Adapter Pattern)
*   The core platform must function perfectly without a POS.
*   POS integrations must be treated as unreliable external systems. Calls to them must be asynchronous and fail gracefully without breaking the primary user experience.

### Feature Flag Everything New
*   New, complex features (KDS, Payment Gateways) should be implemented behind feature flags to allow trunk-based development and safe rollouts.

## 3. Development Principles
*   **Composition over Duplication**: Use the existing UI components (`src/components/`) and design system tokens. Do not create new button styles or modals unless strictly necessary.
*   **Thin Controllers, Fat Services**: Controllers only handle HTTP parsing and response formatting. All business logic lives in `src/services/`.
*   **Strict Envelopes**: Adhere to the API response format documented in `05_API.md`. Never return raw strings or arrays from an endpoint.

## 4. Naming & Structure Conventions
*   **Frontend**: React components use `PascalCase.tsx`. Custom hooks use `camelCase.ts` and start with `use`.
*   **Backend**: Files are named by their domain and layer (e.g., `order.controller.ts`, `table.service.ts`).
*   **Models**: Mongoose models are `PascalCase` (e.g., `TableSession.ts`).

## 5. State Management Rule
*   Do not put everything in Zustand. Use it only for cross-cutting concerns (Cart, Auth, Theme).
*   Use React Query (or local component state) for data fetching and server-state caching.
