# Project Audit

This document provides a high-level summary of the major flows and systems currently implemented in TheScanMenu based on the existing codebase.

## Overview

The platform is designed as a multi-tenant SaaS application serving restaurants. It provides tools for menus, table ordering, order tracking, and staff management, separated into public-facing features (for customers) and admin/manager-facing features (for staff).

## 1. Role System

The platform operates with three primary roles, enforcing strict authorization across routes and data access:

*   **`SUPER_ADMIN`**: Platform owners. They have access to the `/api/v1/admin/*` endpoints to manage all tenants (restaurants), subscriptions, and global platform settings.
*   **`MANAGER`**: Tenant administrators. They can modify their specific restaurant's profile, manage staff, configure menus (categories and items), configure tables, and oversee all operations.
*   **`STAFF`**: General restaurant workers. They have access to operational dashboards (orders, waiter calls, tables) but are restricted from modifying restaurant configurations, managing staff, or deleting items.

## 2. Restaurant Flow

*   **Creation**: Super Admins create and provision new restaurants on the platform.
*   **Configuration**: Managers configure their restaurant's profile, including business details, theme colors, payment options, and tax rates via the `ManagerSettings` views.
*   **Multi-Tenancy**: All operations (menus, orders, staff) are strictly scoped to a specific `restaurantId`. Middleware (`requireRestaurantAccess`) ensures a user can only interact with the restaurant they are associated with.

## 3. Menu Flow

*   **Management**: Managers create `Category` entities and nest `MenuItem` entities within them.
*   **Display**: The public menu is served via `/api/v1/public/restaurants/:slug/...` endpoints, rendering active categories and items based on their `sortOrder`.
*   **Availability**: Items can be toggled as available/unavailable, or softly archived (`isArchived`) to preserve order history while removing them from active menus.

## 4. Table & Session Flow

*   **Table Configuration**: Managers define `TableZone`s and specific `Table`s within those zones. Tables have auto-generated, secure tokens (nanoids) and QR codes.
*   **Table Sessions**: When a customer scans a QR code, a `TableSession` is initiated. This session groups all orders (rounds) placed by that table during a single visit.
*   **Closing Sessions**: Staff/Managers can "Settle Bill" to close a session, transitioning it to `CLOSED` and marking associated orders as `PAID`.

## 5. Ordering Flow

*   **Cart Management**: Customers manage their cart locally using Zustand state.
*   **Placement**: Orders are submitted to the backend and associated with the current `TableSession`.
*   **Workflow**: Orders move through a state machine: `PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`. Depending on the restaurant's configuration, some steps may be bypassed (e.g., 3-step vs. 5-step workflow).
*   **Item-Level Ticking**: Individual items within an order can be tracked independently. The aggregate order status is rolled up automatically from item statuses.
*   **Merging**: If an order is placed while a previous round is still `PENDING`, the items are merged to reduce clutter.

## 6. Waiter Calling Flow

*   **Customer Request**: Customers can use the public interface to request assistance (e.g., "Call Waiter", "Bill", "Water").
*   **Real-time Notification**: These requests are broadcasted via WebSockets (`Socket.IO`) to the active staff dashboards.
*   **Resolution**: Staff view these calls on a dedicated Kanban-style board and mark them as resolved.

## 7. Payment Flow (Current State)

*   **Status Tracking**: Orders track `paymentStatus` (e.g., `PENDING`, `PAID`).
*   **Settle Bill**: The primary payment mechanism currently modeled is closing the `TableSession`, which finalizes the bill for all rounds.
*   **Future Gateway**: The architecture supports external integrations (models have configuration fields for providers like Razorpay), though full checkout processing is handled as an external or future concern.
