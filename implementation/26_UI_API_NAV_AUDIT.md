# UI / API / Navigation Audit — 2026-08-05

## Summary
- Total API endpoints found: 120
- Total frontend routes found: 18
- Total nav entry points found: 24
- Orphaned APIs (no screen): 14
- Unreachable screens (no nav path): 0
- Role/flag mismatches: 6
- Dead nav links: 1

---

## SUPER_ADMIN

### A. APIs with no screen
| Method | Endpoint | Controller | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/v1/admin/restaurants/provision` | `AdminController.provisionRestaurant` | Defined in `admin.routes.ts` (L12) but never invoked in `AdminRestaurants.tsx` or `adminService`. |
| `GET` | `/api/v1/admin/restaurants/:id/onboarding` | `AdminController.getOnboardingProgress` | Defined in `admin.routes.ts` (L13) but no frontend component queries onboarding status. |
| `GET` | `/api/v1/admin/restaurants/:id` | `AdminController.getRestaurant` | Defined in `admin.routes.ts` (L16) & `adminService.ts` (L134), but `AdminRestaurants.tsx` uses list endpoint only. |
| `DELETE` | `/api/v1/admin/restaurants/:id` | `AdminController.deleteRestaurant` | Defined in `admin.routes.ts` (L20), but no delete UI button exists in `AdminRestaurants.tsx` or `adminService`. |
| `PATCH` | `/api/v1/restaurants/:restaurantId/subscription` | `subscriptionController.assignPlan` | Defined in `subscription.routes.ts` (L20) for `SUPER_ADMIN`. Route is unmounted in `server/src/index.ts` and no UI exists. |

### B. Screens with no nav path
| Route | Page File | Calls API | Notes |
| --- | --- | --- | --- |
| None | N/A | N/A | `/admin/restaurants` is reached via root `/` redirect for `SUPER_ADMIN`. |

### C. Mismatches
| Item | Issue | Expected | Actual |
| --- | --- | --- | --- |
| Unmounted Subscription Router | `subscription.routes.ts` defines subscription routes for Super Admin | Router should be mounted in `server/src/index.ts` | Route file exists in `server/src/routes/subscription.routes.ts` but is omitted from `index.ts`. |
| Super Admin Navigation Bar | `AdminRestaurants.tsx` is a isolated page without top nav/sidebar | Navigation header should allow switching between platform admin & tenant views | `AdminRestaurants.tsx` only has a Logout button (L240). |

---

## MANAGER

### A. APIs with no screen
| Method | Endpoint | Controller | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics/summary` | `analyticsController.getSummary` | Specialized summary metrics endpoint in `analytics.routes.ts` (L14); `ManagerAnalytics.tsx` calls main `/analytics` overview instead. |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics/top-items` | `analyticsController.getTopItems` | Top selling items analytics in `analytics.routes.ts` (L15); not called by `ManagerAnalytics.tsx`. |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics/peak-hours` | `analyticsController.getPeakHours` | Peak operating hours analytics in `analytics.routes.ts` (L16); not called by `ManagerAnalytics.tsx`. |
| `GET` | `/api/v1/restaurants/:restaurantId/integrations/sync-logs` | `integrationController.getSyncLogs` | POS sync logs endpoint in `restaurant.routes.ts` (L54); `ManagerSettings.tsx` configures POS but does not fetch sync logs. |
| `PATCH` | `/api/v1/restaurants/:restaurantId/menu-items/:itemId/stock` | `menuController.updateStock` | Dedicated stock adjustment endpoint in `menu.routes.ts` (L67); `ManagerMenu.tsx` uses full `PATCH /menu-items/:itemId` instead. |
| `GET` | `/api/v1/restaurants/:restaurantId/payments/transactions/:id` | `paymentController.getTransaction` | Single transaction detail fetch in `payment.routes.ts` (L19); `ManagerTransactions.tsx` only lists transactions. |
| `POST` | `/api/v1/restaurants/:restaurantId/payments/intent` | `paymentController.createIntent` | Authenticated payment intent creation in `payment.routes.ts` (L13); public endpoints are used for customer intents instead. |
| `GET` | `/api/v1/subscription` | `subscriptionController.getAllPlans` | Defined in `subscription.routes.ts` (L8); unmounted in `index.ts` and no frontend plan selector screen exists. |
| `GET` | `/api/v1/restaurants/:restaurantId/subscription` | `subscriptionController.getRestaurantPlan` | Defined in `subscription.routes.ts` (L13); unmounted in `index.ts` and no frontend subscription status screen exists. |

### B. Screens with no nav path
| Route | Page File | Calls API | Notes |
| --- | --- | --- | --- |
| `/manager/counter` (Mobile) | `ManagerCounter.tsx` | Categories, MenuItems, Counter Order | Present in Desktop Sidebar (`ManagerLayout.tsx` L307), but missing from Mobile Bottom Nav (`ManagerLayout.tsx` L526). |
| `/manager/kds` (Mobile) | `ManagerKDS.tsx` | KDS Tickets, Bump Ticket | Present in Desktop Sidebar (`ManagerLayout.tsx` L322), but missing from Mobile Bottom Nav (`ManagerLayout.tsx` L526). |
| `/manager/developer` (Mobile) | `ManagerDeveloper.tsx` | API Keys, Webhooks | Present in Desktop Sidebar (`ManagerLayout.tsx` L469), but missing from Mobile Bottom Nav (`ManagerLayout.tsx` L526). |

### C. Mismatches
| Item | Issue | Expected | Actual |
| --- | --- | --- | --- |
| Missing Staff Delete Endpoint | `ManagerStaff.tsx` (L64) & `restaurant.service.ts` (L279) call `DELETE /api/v1/restaurants/:restaurantId/staff/:staffId` | `restaurant.routes.ts` should handle `DELETE /staff/:staffId` | Route is missing in `restaurant.routes.ts` (L50-52); clicking delete staff yields HTTP 404. |
| Shadowed Order Analytics Route | `order.routes.ts` (L13) defines `GET /:restaurantId/analytics` (`orderController.getAnalytics`) | Route should handle order analytics | `analyticsRoutes` mounted at `/api/v1/restaurants/:restaurantId/analytics` in `index.ts` (L108) shadows `orderRoutes` (L112), routing requests to `analyticsController.getOverview`. |
| Feature Flag Gating in Nav | `ManagerLayout.tsx` sidebar items for Counter POS and Transactions lack `isEnabled()` check | Navigation items should be hidden if module is unpurchased | Counter POS is always visible; Transactions is visible with an in-page lock fallback. |

---

## STAFF

### A. APIs with no screen
| Method | Endpoint | Controller | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/restaurants/:restaurantId` | `restaurantController.getRestaurantProfile` | `restaurant.routes.ts` (L20) permits STAFF access, but Staff cannot access `/manager/settings` or `/manager/profile` tenant info. |
| `POST` | `/api/v1/restaurants/:restaurantId/payments/intent` | `paymentController.createIntent` | `payment.routes.ts` (L13) permits STAFF access via `requireRestaurantAccess`, but no Staff payment creation screen exists. |

### B. Screens with no nav path
| Route | Page File | Calls API | Notes |
| --- | --- | --- | --- |
| `/manager/counter` (Mobile) | `ManagerCounter.tsx` | Categories, MenuItems, Counter Order | Omitted from Mobile Bottom Nav for Staff. |
| `/manager/kds` (Mobile) | `ManagerKDS.tsx` | KDS Tickets, Bump Ticket | Omitted from Mobile Bottom Nav for Staff. |

### C. Mismatches
| Item | Issue | Expected | Actual |
| --- | --- | --- | --- |
| Menu Item Availability Gating | `menu.routes.ts` (L62) grants `STAFF` permission for `PATCH /menu-items/:itemId/availability` (fast 86ing) | Staff should be able to toggle item availability in UI | `ManagerLayout.tsx` (L222) redirects `STAFF` users away from `/manager/menu` to `/manager/orders`, blocking UI access. |

---

## Dead nav links
| Nav Label | Layout File | Target Route | Issue |
| --- | --- | --- | --- |
| Delete Staff Button | `ManagerStaff.tsx` (L64) | `DELETE /api/v1/restaurants/:restaurantId/staff/:staffId` | Target backend endpoint is not defined in `server/src/routes/restaurant.routes.ts`. |

---

## Recommended Fix Priority

### CRITICAL
1. **Add Missing Staff Delete Route**: Implement `DELETE /api/v1/restaurants/:restaurantId/staff/:staffId` in `server/src/routes/restaurant.routes.ts` and `restaurant.controller.ts` so managers can remove staff members without receiving a 404 error.
2. **Mount Subscription Router**: Import and mount `subscription.routes.ts` in `server/src/index.ts` under `/api/v1/subscriptions` and `/api/v1/restaurants/:restaurantId/subscription` so subscription management is functional.
3. **Fix Shadowed Analytics Route**: Resolve route collision between `order.routes.ts` (`GET /:restaurantId/analytics`) and `analytics.routes.ts` in `server/src/index.ts` so both controller actions are distinctly reachable.
4. **Allow Staff Quick-86 Menu Screen**: Adjust `ManagerLayout.tsx` role check so `STAFF` can access a simplified menu availability toggle view or `/manager/menu` without triggering an auto-redirect to `/manager/orders`.

### MEDIUM
5. **Mobile Navigation Parity**: Add a "More" drawer or expanded bottom bar items in `ManagerLayout.tsx` for `Counter POS`, `KDS`, and `Developer API` so mobile tablet/phone users can access all features without direct URL entry.
6. **Connect Orphaned Analytics Endpoints**: Update `ManagerAnalytics.tsx` to utilize `GET /analytics/summary`, `GET /analytics/top-items`, and `GET /analytics/peak-hours` from `analyticsController` for richer breakdown charts.
7. **Connect POS Sync Logs**: Add a "Sync Logs" drawer or tab in `ManagerSettings.tsx` under the Petpooja section to consume `GET /integrations/sync-logs`.
8. **Connect Dedicated Stock Update Endpoint**: Refactor `ManagerMenu.tsx` quick stock adjustment inputs to hit `PATCH /menu-items/:itemId/stock`.

### LOW
9. **Super Admin Header Navigation**: Add a top navigation bar to `AdminRestaurants.tsx` with quick links and tenant switching.
10. **Clean Up Unused Admin/Payment Endpoints**: Remove or wire up unused endpoints (`POST /admin/restaurants/provision`, `GET /admin/restaurants/:id/onboarding`, `GET /payments/transactions/:id`).
