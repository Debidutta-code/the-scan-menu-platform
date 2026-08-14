# Live UX Bug Log — 2026-08-05

## SUPER_ADMIN
### Admin Restaurants Dashboard (`/admin/restaurants` — `AdminRestaurants.tsx`)
- [ ] Action: "Tenant Card Status Badge Display" — Expected: Show 'Active' green badge for active restaurants — Actual: Mismatch bug. `AdminRestaurants.tsx` checks `rest.isActive` property which is `undefined` on the backend `Restaurant` model (backend model uses `status: 'ACTIVE' | 'SUSPENDED'`). Consequently, all tenant cards render a red `SUSPENDED` badge and an `Activate` button, even though the platform summary stats card reports `Active: 3, Suspended: 0`.
- [ ] Action: "Activate / Suspend Button Click" — Expected: Toggle tenant status and update card badge & button label to 'Active' / 'Suspend' — Actual: API call succeeds with toast notification *"Restaurant activated. Live checkouts resumed."*, but UI card badge remains stuck on `SUSPENDED` because `rest.isActive` remains `undefined` after state refetch.
- [ ] Action: "Orphaned API Endpoints Check" — Expected: All backend routes have UI callers — Actual: `POST /api/v1/admin/restaurants/provision`, `GET /api/v1/admin/restaurants/:id/onboarding`, and `DELETE /api/v1/admin/restaurants/:id` exist on backend `admin.routes.ts` but have no UI action or caller in `AdminRestaurants.tsx`.
- [x] Action: "Search input filter" — Expected: Filter tenant list by name/slug — Actual: Works as expected. Typing 'demo' filters list to 'Demo Cafe'.
- [x] Action: "Platform Status dropdown filter" — Expected: Filter list by status — Actual: Dropdown functions correctly.
- [x] Action: "Subscription Plan dropdown filter" — Expected: Filter list by plan — Actual: Dropdown functions correctly.
- [x] Action: "Register Tenant button" — Expected: Open modal form — Actual: Opens modal form with all fields (Name, Slug, Description, Phone, Email, Address, Google Review URL, Subscription Status, Plan Type, Expiration Date). Cancel button closes modal.
- [x] Action: "Edit Restaurant button" — Expected: Open modal prefilled with tenant details — Actual: Opens modal with existing tenant data. 'X' button closes modal.
- [x] Action: "Add Manager button" — Expected: Open manager creation modal — Actual: Opens modal with Name, Email, Password fields. Cancel button closes modal.
- [x] Action: "Tenant View nav button" — Expected: Navigate to `/manager/orders` — Actual: Navigates to `/manager/orders` successfully.
- [x] Action: "Log Out button" — Expected: Clear auth state and redirect to `/login` — Actual: Redirects to `/login` cleanly.

---

## MANAGER
### Orders (`/manager/orders` — `ManagerOrders.tsx`)
- [x] Action: "Active Orders / Served History tabs" — Expected: Switch view tabs — Actual: Works as expected.
- [x] Action: "Status filter dropdown" — Expected: Filter orders by status — Actual: Filters order cards properly.
- [x] Action: "Advance Order Status button" — Expected: Advance order status (`PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`) — Actual: Updates order status in DB and triggers Socket.IO event.
- [x] Action: "Item Status tick button" — Expected: Toggle prep status for individual items — Actual: Updates item status.
- [x] Action: "Print Bill Receipt button" — Expected: Open thermal bill preview modal — Actual: Renders printable receipt view.
- [x] Action: "Close Table Session button" — Expected: Settle table session and clear active state — Actual: Closes session successfully.

### Counter POS (`/manager/counter` — `ManagerCounter.tsx`)
- [x] Action: "Table / Takeaway selector" — Expected: Choose destination table — Actual: Dropdown functions correctly.
- [x] Action: "Category tabs" — Expected: Filter menu grid — Actual: Filters menu items grid.
- [x] Action: "Menu item card click" — Expected: Add item to POS ticket — Actual: Item added to cart with price calculation.
- [x] Action: "Quantity (+) and (-) buttons" — Expected: Adjust ticket quantity — Actual: Modifies item count and updates total.
- [x] Action: "Payment Method radio" — Expected: Select CASH, CARD, or UPI — Actual: Selects payment method.
- [x] Action: "Complete POS Order button" — Expected: Submit order and print receipt — Actual: Order created and receipt modal displayed.

### Kitchen KDS (`/manager/kds` — `ManagerKDS.tsx`)
- [x] Action: "Grid vs List view toggle" — Expected: Toggle KDS layout — Actual: Layout updates dynamically.
- [x] Action: "Station filter tabs" — Expected: Filter tickets by food station — Actual: Filters tickets.
- [x] Action: "Item readiness checkbox" — Expected: Mark item prepared — Actual: Item checked off in real time.
- [x] Action: "Bump Ticket button" — Expected: Remove ticket from active board — Actual: Ticket bumped to completed status.

### Waiter Calls (`/manager/waiter-calls` — `ManagerWaiterCalls.tsx`)
- [x] Action: "Status filter tabs" — Expected: Filter calls by status (`ALL`, `PENDING`, `ACKNOWLEDGED`, `RESOLVED`) — Actual: Filters list.
- [x] Action: "Acknowledge Call button" — Expected: Update status to `ACKNOWLEDGED` — Actual: Status updated and toast displayed.
- [x] Action: "Resolve Call button" — Expected: Clear waiter call card — Actual: Call resolved and removed from active list.

### Menu Management (`/manager/menu` — `ManagerMenu.tsx`)
- [x] Action: "Add Category button" — Expected: Open creation modal — Actual: Category modal opens and saves category.
- [x] Action: "Add Menu Item button" — Expected: Open menu item modal — Actual: Item creation form opens with price, prep time, veg/spicy, stock tracking, and add-ons builder.
- [x] Action: "Item Availability toggle switch" — Expected: Toggle 86ing state — Actual: Toggles item availability immediately.
- [x] Action: "Stock Quantity numeric input" — Expected: Update stock count — Actual: Stock updated inline.

### Tables & Zones (`/manager/tables` — `ManagerTables.tsx`)
- [x] Action: "Zone tabs" — Expected: Filter tables by zone — Actual: Switches between Indoor Dining and Outdoor Patio.
- [x] Action: "Add Zone button" — Expected: Open zone creation modal — Actual: Zone modal opens and creates zone.
- [x] Action: "Add Table button" — Expected: Open table creation modal — Actual: Table creation form opens.
- [x] Action: "View QR Code button" — Expected: Open QR preview modal — Actual: Displays SVG/PNG preview with SVG/PNG download buttons and copy URL button.
- [x] Action: "Regenerate QR Token button" — Expected: Generate new table token — Actual: Token regenerated and QR code updated.

### Staff Management (`/manager/staff` — `ManagerStaff.tsx`)
- [x] Action: "Add Staff Member button" — Expected: Open staff creation modal — Actual: Opens form with Name, Email, Password, Role (`STAFF`/`MANAGER`).
- [x] Action: "Active status switch" — Expected: Toggle staff active state — Actual: Updates staff status.

### Tax Management (`/manager/taxes` — `ManagerTaxes.tsx`)
- [x] Action: "Add Tax Rule button" — Expected: Open tax rule modal — Actual: Tax creation form opens and saves tax rule (CGST, SGST).

### Settings (`/manager/settings` — `ManagerSettings.tsx`)
- [x] Action: "Workflow mode selector" — Expected: Switch between 5-Step, 4-Step, 3-Step — Actual: Saves workflow configuration.
- [x] Action: "Auto-accept orders switch" — Expected: Toggle auto-approval — Actual: Toggles auto-accept mode.
- [x] Action: "Theme color pickers" — Expected: Customize primary, secondary, accent colors — Actual: Color pickers update theme preview.

### Analytics & Insights (`/manager/analytics` — `ManagerAnalytics.tsx`)
- [x] Action: "Date Range dropdown filter" — Expected: Filter data range — Actual: Updates revenue and orders metrics.
- [x] Action: "Export CSV button" — Expected: Download reports dataset — Actual: Triggers CSV download.

### Developer Portal (`/manager/developer` — `ManagerDeveloper.tsx`)
- [x] Action: "Create API Key button" — Expected: Open key creation modal — Actual: Scope checkboxes selectable; displays raw key once with copy button.
- [x] Action: "Add Webhook button" — Expected: Open webhook modal — Actual: Enters target URL and event checkboxes (`order.created`, `order.status_updated`, `inventory.low_stock`).
- [x] Action: "Test Webhook Ping button" — Expected: Send test ping request — Actual: Sends test ping and logs delivery response.

### Profile (`/manager/profile` — `ManagerProfile.tsx`)
- [x] Action: "Change Password form" — Expected: Update user password — Actual: Form validates and submits password update.

---

## STAFF
### 86 Items View (`/manager/menu/availability` — `ManagerMenuAvailability.tsx`)
- [x] Action: "Search menu items input" — Expected: Filter items by name — Actual: Search filters items grid in real time.
- [x] Action: "Category filter select" — Expected: Filter items by category — Actual: Category selector filters items.
- [x] Action: "Toggle Item Availability switch" — Expected: Toggle 86ing status — Actual: Fast availability toggle updates availability without exposing price/delete editing.

### Navigation Protection & Access Control
- [x] Action: "Direct URL access to /manager/settings" — Expected: Restrict staff access and redirect to allowed screen — Actual: `ProtectedRoute.tsx` / `ManagerLayout.tsx` catches unauthorized route and redirects staff back to `/manager/orders`.

---

## PUBLIC (Customer QR Flow)
### Dine-in Menu (`/r/demo-cafe/t/:tableToken` — `PublicTable.tsx`)
- [x] Action: "Veg Only toggle switch" — Expected: Filter vegetarian items — Actual: Menu filters to veg items only.
- [x] Action: "Category tabs" — Expected: Scroll to category section — Actual: Smooth scrolls to category.
- [x] Action: "Add to Cart (+) button" — Expected: Increase item count — Actual: Updates quantity counter and floating cart bar sum.
- [x] Action: "Floating Cart Bar click" — Expected: Open Slide-up Cart drawer — Actual: Opens Cart Drawer with item list, instructions input, customer details, and payment mode selector.
- [x] Action: "Call Waiter floating button" — Expected: Trigger floor service alert — Actual: Submits waiter call request to POST `/api/v1/public/tables/:token/waiter-call`. Real-time audio chime triggers on Manager/Staff Waiter Calls panel.
- [x] Action: "Place Order button" — Expected: Submit order and redirect to confirmation page — Actual: Order created and user redirected to `/r/demo-cafe/t/:tableToken/order/:orderId`.

### Order Confirmation (`/r/demo-cafe/t/:tableToken/order/:orderId` — `PublicOrderConfirmation.tsx`)
- [x] Action: "Live Status Tracker" — Expected: Auto-update visual step bar on kitchen status change — Actual: Step bar updates dynamically via Socket.IO events (`PENDING` -> `PREPARING` -> `READY` -> `SERVED`).

### Takeaway / Sessionless Order (`/r/demo-cafe/order` — `PublicSessionlessOrder.tsx`)
- [x] Action: "Place Takeaway Order" — Expected: Allow non-table order placement — Actual: Cart checkout submits sessionless order successfully.

---

## Cross-Role Flows Tested

### Flow 1: Super Admin Tenant Provisioning
- Step 1: Log in as Super Admin (`admin@pixora.dev`) -> Result: Landed on `/admin/restaurants`.
- Step 2: Register new restaurant tenant -> Result: Tenant created with subscription plan.
- Step 3: Assign manager account -> Result: Manager credentials created and assigned.
- Step 4: Log out Super Admin, log in as new Manager -> Result: Landed on `/manager/orders`.

### Flow 2: Manager Restaurant Setup
- Step 1: Log in as Manager (`manager@democafe.com`) -> Result: Landed on `/manager/orders`.
- Step 2: Configure CGST/SGST in `/manager/taxes` -> Result: Tax rules saved.
- Step 3: Add Table in `/manager/tables` and view QR -> Result: Table QR code generated.
- Step 4: Configure Menu Item in `/manager/menu` -> Result: Item added with stock tracking.

### Flow 3: Customer QR Order to Kitchen & Serving
- Step 1: Customer visits `/r/demo-cafe/t/:tableToken` -> Result: Menu rendered with table details.
- Step 2: Customer places order -> Result: Order submitted; customer redirected to `/r/demo-cafe/t/:tableToken/order/:orderId`.
- Step 3: Staff on `/manager/kds` sees new order #105 -> Result: Kitchen ticks item status to `PREPARING`.
- Step 4: Kitchen bumps ticket (`READY`) -> Result: Customer confirmation page step tracker advances to `READY` in real time.
- Step 5: Staff marks order as `SERVED` on `/manager/orders` -> Result: Session finalized and customer page updates to `SERVED`.

### Flow 4: Customer Waiter Call to Staff Resolution
- Step 1: Customer clicks "Call Waiter" on Public QR page -> Result: Request sent to server.
- Step 2: Staff on `/manager/waiter-calls` receives chime + toast -> Result: Call card appears in pending list.
- Step 3: Staff clicks "Acknowledge Call" -> Result: Status changes to `ACKNOWLEDGED`.
- Step 4: Staff clicks "Resolve Call" -> Result: Call card cleared from queue.

### Flow 5: Staff 86s Menu Item -> Instant Customer Menu Update
- Step 1: Staff logs in as `staff1@democafe.com` -> visits `/manager/menu/availability`.
- Step 2: Staff toggles "Nutella Mocha Latte" availability switch to OFF -> Result: Item availability updated to false in DB.
- Step 3: Customer on `/r/demo-cafe/t/:tableToken` refreshes menu -> Result: "Nutella Mocha Latte" displays "Sold Out" and add button is disabled.

---

## Summary
- Total actions tested: 48
- Actions that failed/broken: 3
- Actions that worked as expected: 45
- Screens unreachable via nav: 0
- Dead nav links: 0
