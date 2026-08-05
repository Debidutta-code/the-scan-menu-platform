# Super Admin Advanced Features Plan (Phase 30)

## Executive Summary
This plan details the implementation of 5 major enterprise-grade Super Admin features to give platform operators complete control over **External POS Integrations**, **Payment Gateways & Methods**, **Tenant Impersonation**, **Global System Audit Trails**, and **Custom Domains / White-Labeling**.

---

## 1. Feature Specifications

### 1a. External POS Integrations Hub (`/admin/pos-integrations`)
- **Backend Endpoints:**
  - `GET /api/v1/admin/pos/outlets`: List all tenants with POS integration status (`provider`, `outletId`, `enabled`, `lastSyncAt`).
  - `GET /api/v1/admin/pos/sync-logs`: Query cross-tenant POS sync audit logs (`SYNC_MENU`, `PUSH_ORDER`, `UPDATE_STATUS`).
  - `POST /api/v1/admin/pos/:restaurantId/sync-menu`: Trigger manual menu sync for any outlet.
  - `PATCH /api/v1/admin/pos/:restaurantId/config`: Configure POS credentials and toggle integration.
- **Frontend Component:** `AdminPOSIntegrations.tsx`
  - Connected Outlets table with inline outlet ID, status badge, and "Sync Catalog Now" button.
  - POS Sync Audit Logs inspector with filters by operation type (`SYNC_MENU`, `PUSH_ORDER`) and status (`SUCCESS`, `FAILED`).

### 1b. Global Payment Gateways & Gateway Manager (`/admin/payments`)
- **Backend Endpoints:**
  - `GET /api/v1/admin/payments/overview`: Aggregated transaction sums by provider (`CASH`, `CARD`, `UPI`, `RAZORPAY`).
  - `GET /api/v1/admin/payments/tenant-configs`: Matrix of payment method enablements per tenant.
  - `PATCH /api/v1/admin/payments/restaurants/:restaurantId/methods`: Bulk toggle Cash, Card, UPI, and Razorpay per tenant.
- **Frontend Component:** `AdminPaymentGateways.tsx`
  - Payment Volume Breakdown summary cards.
  - Gateway status indicator (Razorpay Online Checkout).
  - Tenant Payment Configuration Matrix table with direct checkbox toggles.

### 1c. Tenant Impersonation & Outlet Switcher
- **State & Context Integration:**
  - Super Admin can click "Switch to Outlet" on any tenant card or detail page.
  - Stores `adminImpersonatedRestaurantId` in `localStorage` and updates `useAuth` context.
  - `apiClient` attaches `x-impersonate-restaurant-id` header to route requests to the impersonated tenant.
  - Persistent Top Banner across Manager pages: *"SuperAdmin Impersonation Mode: Currently managing Demo Cafe (Exit Impersonation)"*.
  - One-click "Exit Impersonation" returns context to Super Admin Console.

### 1d. Global System Audit Trail (`/admin/audit-logs`)
- **Backend Endpoints:**
  - `GET /api/v1/admin/audit-logs`: Unified query endpoint returning audit events (`RESTAURANT_CREATED`, `RESTAURANT_SUSPENDED`, `MANAGER_ASSIGNED`, `PLAN_CHANGED`, `FEATURE_FLAG_TOGGLED`, `POS_SYNCED`).
- **Frontend Component:** `AdminAuditLogs.tsx`
  - Timeline feed with event severity badges, actor details, timestamps, and metadata inspector.
  - Filtering by event category, date range, and keyword search.

### 1e. Custom Domains & White-Label Oversight (`/admin/white-label`)
- **Backend Endpoints:**
  - `GET /api/v1/admin/white-label/domains`: List all enterprise white-labeled outlets, custom CNAME domains (`menu.democafe.com`), and `hidePoweredBy` status.
  - `POST /api/v1/admin/white-label/domains/:restaurantId/verify`: Verify CNAME DNS resolution.
  - `PATCH /api/v1/admin/white-label/domains/:restaurantId`: Update white-label settings and domain approval.
- **Frontend Component:** `AdminWhiteLabel.tsx`
  - Custom Domains directory with DNS resolution status (`ACTIVE`, `PENDING_DNS`, `FAILED`).
  - "Verify DNS Now" trigger button.
  - "Hide Powered by Pixora" entitlement override toggle.

---

## 2. Proposed Artifacts & Files

### Backend Components
- [MODIFY] [server/src/routes/admin.routes.ts](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/server/src/routes/admin.routes.ts)
- [MODIFY] [server/src/controllers/admin.controller.ts](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/server/src/controllers/admin.controller.ts)
- [NEW] [server/src/models/AuditLog.ts](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/server/src/models/AuditLog.ts)
- [NEW] [server/src/services/auditLog.service.ts](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/server/src/services/auditLog.service.ts)

### Frontend Layout & Context
- [MODIFY] [client/src/hooks/useAuth.ts](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/hooks/useAuth.ts)
- [MODIFY] [client/src/lib/api.ts](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/lib/api.ts)
- [MODIFY] [client/src/components/AdminLayout.tsx](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/components/AdminLayout.tsx)
- [MODIFY] [client/src/components/ManagerLayout.tsx](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/components/ManagerLayout.tsx)

### Frontend Pages
- [NEW] [client/src/pages/AdminPOSIntegrations.tsx](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminPOSIntegrations.tsx)
- [NEW] [client/src/pages/AdminPaymentGateways.tsx](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminPaymentGateways.tsx)
- [NEW] [client/src/pages/AdminAuditLogs.tsx](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminAuditLogs.tsx)
- [NEW] [client/src/pages/AdminWhiteLabel.tsx](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminWhiteLabel.tsx)

---

## 3. Verification Plan
- **Frontend Compilation:** Run `npm run build` in `client/` to ensure 0 TypeScript errors.
- **Backend Test Suite:** Run `npm test` in `server/` to verify test suite passes cleanly.
- **Manual Verification:** Test impersonation banner, POS sync logs, payment gateway toggles, audit logs, and custom domain verifications.
