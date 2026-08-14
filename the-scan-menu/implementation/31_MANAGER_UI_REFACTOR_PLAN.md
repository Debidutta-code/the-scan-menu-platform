# Manager UI Refactor & Expansion Plan (Phase 31)

## Executive Summary
This plan details a comprehensive refactor and expansion of the **Manager & Operational UI** across all 14 existing pages, plus the creation of **2 NEW dedicated Manager Pages**: **`/manager/inventory` (Inventory & Stock Control Center)** and **`/manager/white-label` (White-Label & Custom Branding Portal)**.

---

## 1. New Manager Pages to Build

### 1a. `/manager/inventory` (`ManagerInventory.tsx`)
- **Purpose:** Dedicated inventory tracking and stock management center.
- **Features:**
  - Stock summary cards: Total Catalog Items, In-Stock, Low-Stock Warning (<5 portions), Out of Stock (86'd).
  - Stock table with inline stock count editor, quick replenishment (+10, +25, Reset), and `trackInventory` toggle.
  - Low-stock threshold alerts and auto-out-of-stock indicators.

### 1b. `/manager/white-label` (`ManagerWhiteLabel.tsx`)
- **Purpose:** Custom branding and custom domain portal for Enterprise tier outlets.
- **Features:**
  - Custom CNAME domain setup (`menu.gourmetbistro.com`) and DNS status checker.
  - "Hide Powered by Pixora" badge toggle.
  - Custom logo and favicon URL inputs.
  - Primary & secondary brand theme accent color pickers with live customer menu UI preview.

---

## 2. Refactored Existing Manager Pages

1. **`ManagerOrders.tsx` (`/manager/orders`)**: Live order queue with fulfillment status tabs (`ALL`, `PENDING`, `PREPARING`, `READY`, `SERVED`, `CANCELLED`), order item cards, instant bill print modal, and cancellation reason popup.
2. **`ManagerCounter.tsx` (`/manager/counter`)**: Rapid POS order entry interface with category tabs, live cart summary, discount/tax calculations, customer inputs, and instant receipt generation.
3. **`ManagerKDS.tsx` (`/manager/kds`)**: Kitchen Display System ticket board with station filters, item preparation toggles, and ticket bump buttons.
4. **`ManagerMenu.tsx` (`/manager/menu`)**: Menu catalog manager with category creation, item CRUD, pricing, veg/spicy badges, add-ons manager, and stock toggling.
5. **`ManagerMenuAvailability.tsx` (`/manager/menu/availability`)**: Staff-friendly rapid 86'd availability toggle grid.
6. **`ManagerTables.tsx` (`/manager/tables`)**: Table & zone layout manager, QR token generator with high-res SVG/PNG export, and bulk table creation wizard.
7. **`ManagerStaff.tsx` (`/manager/staff`)**: Staff team management with role filters (`MANAGER`, `STAFF`), staff creation modal, and POS PIN assignment.
8. **`ManagerTaxes.tsx` (`/manager/taxes`)**: Tax rule manager (CGST, SGST, Service Tax, VAT) with inclusive/exclusive tax calculations preview.
9. **`ManagerSettings.tsx` (`/manager/settings`)**: Outlet profile settings, opening hours, workflow mode selector (`SERVE_FIRST_PAY_LATER` vs `PAY_FIRST_SERVE_LATER`), Razorpay credentials, and UPI QR uploader.
10. **`ManagerAnalytics.tsx` (`/manager/analytics`)**: Revenue reports, top-selling items leaderboard, peak ordering hours, and CSV export.
11. **`ManagerDeveloper.tsx` (`/manager/developer`)**: Developer portal with API key creation, webhook subscriptions, and delivery logs.
12. **`ManagerTransactions.tsx` (`/manager/transactions`)**: Transaction log with payment method badges (`CASH`, `CARD`, `UPI`, `RAZORPAY`) and order lookups.
13. **`ManagerProfile.tsx` (`/manager/profile`)**: Account details and password change utility.

---

## 3. Layout & Routing Updates
- Update `ManagerLayout.tsx` to add **Inventory** (`/manager/inventory`) and **White-Label** (`/manager/white-label`) navigation tabs.
- Update `App.tsx` routes.

---

## 4. Verification Plan
- **Frontend Compilation:** Run `npm run build` in `client/` to verify 0 TypeScript errors.
- **Backend Tests:** Run `npx vitest run` in `server/` to verify test suite passes cleanly.
