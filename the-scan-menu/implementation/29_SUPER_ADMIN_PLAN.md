# Super Admin Control Center — Implementation Plan (Phase 29)

## 1. Executive Summary
This plan outlines the architecture, page structure, navigation, API integrations, and backend additions required to build a dedicated, production-grade **Super Admin Control Center** for **TheScanMenu**. 

The new control center will feature a persistent sidebar layout (`AdminLayout.tsx`), complete tenant management lifecycle tools, platform-wide analytics, subscription controls, global feature flag auditing, and hard-delete safety protections.

---

## 2. Audit of Existing Code & Endpoints

### Existing Backend Endpoints (`SUPER_ADMIN` Scope)
| Endpoint Path | Method | Controller Method | Current Status / Usage |
|---|---|---|---|
| `/api/v1/admin/stats` | `GET` | `AdminController.getPlatformStats` | **Used** in `AdminRestaurants.tsx` (returns total restaurants, active/suspended counts, total orders, activity feed). |
| `/api/v1/admin/restaurants` | `GET` | `AdminController.listRestaurants` | **Used** in `AdminRestaurants.tsx` (paginated list of restaurants). |
| `/api/v1/admin/restaurants` | `POST` | `AdminController.createRestaurant` | **Used** in `AdminRestaurants.tsx` ("Register Tenant" modal). |
| `/api/v1/admin/restaurants/:id` | `GET` | `AdminController.getRestaurant` | **ORPHANED** (no frontend caller). |
| `/api/v1/admin/restaurants/:id` | `PATCH` | `AdminController.editRestaurant` | **Used** in `AdminRestaurants.tsx` (edit tenant modal). |
| `/api/v1/admin/restaurants/:id/suspend` | `PATCH` | `AdminController.suspendRestaurant` | **Used** in `AdminRestaurants.tsx`. |
| `/api/v1/admin/restaurants/:id/activate` | `PATCH` | `AdminController.activateRestaurant` | **Used** in `AdminRestaurants.tsx`. |
| `/api/v1/admin/restaurants/:id` | `DELETE` | `AdminController.deleteRestaurant` | **ORPHANED** (soft-deletes to `status: 'ARCHIVED'`). |
| `/api/v1/admin/restaurants/:id/managers` | `POST` | `AdminController.assignManager` | **Used** in `AdminRestaurants.tsx` (assign manager modal). |
| `/api/v1/admin/restaurants/provision` | `POST` | `AdminController.provisionRestaurant` | **ORPHANED** (atomic multi-document transaction provisioning). |
| `/api/v1/admin/restaurants/:id/onboarding` | `GET` | `AdminController.getOnboardingProgress` | **ORPHANED** (retrieves `RestaurantOnboarding` checklist). |
| `/api/v1/subscriptions` | `GET` | `subscriptionController.getAllPlans` | **Used** in `ManagerSettings.tsx`. |
| `/api/v1/restaurants/:id/subscription` | `PATCH` | `subscriptionController.assignPlan` | **Used** in `AdminRestaurants.tsx` inline edit. |

---

## 3. New Backend Work Required

While `AdminController.getPlatformStats` provides high-level restaurant and order counts, platform-wide financial trends, order volume graphs, top-performing restaurant leaderboards, and plan distribution metrics are currently missing.

### New API Endpoints to Build
1. **`GET /api/v1/admin/analytics`**
   - **Service Layer:** `adminAnalyticsService.getPlatformAnalytics()`
   - **Controller:** `AdminController.getPlatformAnalytics`
   - **Metrics Computed:**
     - **Platform GMV (Gross Merchandise Value):** Sum of all non-cancelled order totals across all tenants.
     - **Revenue & Order Trends:** 30-day daily breakdown of total revenue and order volume.
     - **Top Performing Restaurants:** Top 5 restaurants ranked by total revenue and total order count.
     - **Subscription Plan Distribution:** Breakdown of tenants across `FREE`, `STARTER`, `PROFESSIONAL`, and `ENTERPRISE` plans.
     - **Tenant Registration Growth:** Monthly sign-up counts for the past 6 months.

---

## 4. Proposed Super Admin Control Center Structure

### 4a. Design & Layout (`AdminLayout.tsx`)
- Persistent sidebar modeled directly after `ManagerLayout.tsx` with:
  - Branding header: **Pixora SuperAdmin** (Platform Operations).
  - Navigation menu with active-tab styling and Lucide icons.
  - User footer with avatar badge and **Log Out** button.
  - Mobile bottom navigation bar and slide-up "More" drawer for responsive viewports.
- Easing & Animation: Framer Motion micro-interactions (`cubic-bezier(0.16, 1, 0.3, 1)`).

### 4b. Page Routing & Features
All pages will be wrapped in `<AdminLayout />` under the `/admin/*` route group in `App.tsx`:

| URL Path | Component | Purpose & Features | API Endpoints Used |
|---|---|---|---|
| `/admin/dashboard` | `AdminDashboard.tsx` (NEW) | **Platform Overview:** High-level metrics (Total GMV, Total Orders, Active Tenants, Suspended Tenants), 30-day revenue graph, plan distribution card, recent activity feed, and quick action shortcuts. | `GET /api/v1/admin/stats`, `GET /api/v1/admin/analytics` |
| `/admin/restaurants` | `AdminRestaurants.tsx` | **Tenants Directory:** List, search, filter by status and subscription plan. Actions: Edit, Add Manager, Suspend/Activate, Archive (Delete), and View Details link. | `GET /api/v1/admin/restaurants`, `PATCH /.../suspend`, `PATCH /.../activate`, `DELETE /...` |
| `/admin/restaurants/:id` | `AdminRestaurantDetail.tsx` (NEW) | **Tenant Deep Dive:** Detailed profile view for a single restaurant showing code, status, managers/staff list, active subscription details, onboarding status, and quick management controls. | `GET /api/v1/admin/restaurants/:id`, `GET /api/v1/restaurants/:id/staff`, `GET /api/v1/admin/restaurants/:id/onboarding`, `GET /api/v1/restaurants/:id/feature-flags` |
| `/admin/restaurants/provision` | `AdminProvision.tsx` (NEW) | **Full Tenant Provisioning Wizard:** Single-page wizard for `POST /api/v1/admin/restaurants/provision` that atomically provisions restaurant details, manager account, 10 default tables with QR codes, and default settings in one step. | `POST /api/v1/admin/restaurants/provision` |
| `/admin/subscriptions` | `AdminSubscriptions.tsx` (NEW) | **Subscription Management:** Overview of platform subscription plans (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`), list of tenants per plan, plan features list, and plan change modal. | `GET /api/v1/subscriptions`, `GET /api/v1/admin/restaurants`, `PATCH /api/v1/restaurants/:id/subscription` |
| `/admin/analytics` | `AdminAnalytics.tsx` (NEW) | **Platform-Wide Analytics:** Cross-tenant GMV trend chart, order volume trend chart, top 5 tenant leaderboard by sales, and registration growth. | `GET /api/v1/admin/analytics` |
| `/admin/feature-flags` | `AdminFeatureFlags.tsx` (NEW) | **Global Feature Flags Matrix:** Platform-wide matrix table showing all 10 feature flags across all tenants, with direct toggle functionality per tenant. | `GET /api/v1/admin/restaurants`, `GET /api/v1/restaurants/:id/feature-flags`, `PATCH /api/v1/restaurants/:id/feature-flags` |
| `/admin/profile` | `AdminProfile.tsx` (NEW) | **Account Settings:** Super Admin profile details, display name update, and password change utility. | `GET /api/v1/auth/me`, `POST /api/v1/auth/change-password` |

---

## 5. Specific Bug Fixes & Safety Features

### 5a. Fix Status Display Bug (`AdminRestaurants.tsx`)
- **Root Cause:** Current UI code checks `rest.isActive` which is `undefined` because the backend model uses `status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'ARCHIVED'`.
- **Fix:** Update all tenant card badges, status filters, and action buttons to check `rest.status === 'ACTIVE'` (or `rest.status === 'TRIAL'`).

### 5b. Safe Tenant Deletion (Archiving)
- Hard deletion of a tenant with historical orders is unsafe. The backend `deleteRestaurant` controller already soft-deletes by setting `status: 'ARCHIVED'`.
- **UI Safeguard:** The "Delete / Archive Tenant" action will require opening a modal where the Super Admin must type the exact restaurant slug (e.g. `demo-cafe`) before the delete button is enabled.

---

## 6. Implementation Steps Summary
1. **Backend Addition:** Add `GET /api/v1/admin/analytics` endpoint in `server/src/routes/admin.routes.ts` with service method in `admin.service.ts` / `admin.controller.ts`.
2. **Layout Creation:** Build `client/src/components/layouts/AdminLayout.tsx` with sidebar, header, active route highlighting, and mobile responsiveness.
3. **Bug Fix:** Fix `rest.status` mapping in `AdminRestaurants.tsx`.
4. **New Pages Creation:** Build `AdminDashboard.tsx`, `AdminRestaurantDetail.tsx`, `AdminProvision.tsx`, `AdminSubscriptions.tsx`, `AdminAnalytics.tsx`, `AdminFeatureFlags.tsx`, and `AdminProfile.tsx`.
5. **Routing Update:** Update `client/src/App.tsx` routes to wrap all `/admin/*` routes in `ProtectedRoute` and `AdminLayout`.
6. **Documentation & Verification:** Update `05_API.md` and `27_FULL_INVENTORY.md`, run `npm run lint` and `npm test`.
