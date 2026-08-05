# Ground-Truth Inventory — TheScanMenu

> Generated via direct codebase audit of `client/src/**` and `server/src/**`.

---

## 1. Pages/Screens Inventory

### SUPER_ADMIN
| Route Path | Component File | Allowed Roles | One-Line Description | Layout Wrapper |
|---|---|---|---|---|
| `/admin/dashboard` | `client/src/pages/AdminDashboard.tsx` | `SUPER_ADMIN` | Platform overview home: total GMV, orders, active/suspended stats, 30-day revenue graph, plan distribution. | `AdminLayout` |
| `/admin/restaurants` | `client/src/pages/AdminRestaurants.tsx` | `SUPER_ADMIN` | Multi-tenant restaurant directory, platform stats, status filters, tenant details link, and soft-delete archive modal. | `AdminLayout` |
| `/admin/restaurants/provision` | `client/src/pages/AdminProvision.tsx` | `SUPER_ADMIN` | One-click atomic tenant provisioning wizard (restaurant + manager + 10 tables + QR codes + settings). | `AdminLayout` |
| `/admin/restaurants/:id` | `client/src/pages/AdminRestaurantDetail.tsx` | `SUPER_ADMIN` | Deep-dive tenant profile, assigned personnel, subscription info, onboarding progress checklist, and feature flags. | `AdminLayout` |
| `/admin/subscriptions` | `client/src/pages/AdminSubscriptions.tsx` | `SUPER_ADMIN` | Subscription control center: tier structures, included features, active tenant counts, and plan assignment modal. | `AdminLayout` |
| `/admin/analytics` | `client/src/pages/AdminAnalytics.tsx` | `SUPER_ADMIN` | Cross-tenant intelligence: platform GMV, 30-day transaction trends, and top performing restaurant leaderboards. | `AdminLayout` |
| `/admin/feature-flags` | `client/src/pages/AdminFeatureFlags.tsx` | `SUPER_ADMIN` | Global feature flags matrix: inspect and toggle 10 feature flags across any tenant outlet. | `AdminLayout` |
| `/admin/profile` | `client/src/pages/AdminProfile.tsx` | `SUPER_ADMIN` | Super Admin account profile details and security password change form. | `AdminLayout` |

### MANAGER
| Route Path | Component File | Allowed Roles | One-Line Description | Layout Wrapper |
|---|---|---|---|---|
| `/manager/orders` | `client/src/pages/ManagerOrders.tsx` | `MANAGER`, `SUPER_ADMIN` | Live order queue management, status workflow advancement, order cancellation, and bill printing. | `ManagerLayout` |
| `/manager/counter` | `client/src/pages/ManagerCounter.tsx` | `MANAGER`, `SUPER_ADMIN` | Rapid POS order entry interface for counter checkout and instant bill generation. | `ManagerLayout` |
| `/manager/kds` | `client/src/pages/ManagerKDS.tsx` | `MANAGER`, `SUPER_ADMIN` | Kitchen Display System real-time ticket board for chef status updates and order bumping. | `ManagerLayout` |
| `/manager/waiter-calls` | `client/src/pages/ManagerWaiterCalls.tsx` | `MANAGER`, `SUPER_ADMIN` | Real-time floor service and waiter call request resolution panel. | `ManagerLayout` |
| `/manager/menu` | `client/src/pages/ManagerMenu.tsx` | `MANAGER`, `SUPER_ADMIN` | Full menu management: category creation, item CRUD, pricing, stock tracking, and reordering. | `ManagerLayout` |
| `/manager/tables` | `client/src/pages/ManagerTables.tsx` | `MANAGER`, `SUPER_ADMIN` | Table and dining zone management, QR token generation, SVG/PNG export, and activation. | `ManagerLayout` |
| `/manager/staff` | `client/src/pages/ManagerStaff.tsx` | `MANAGER`, `SUPER_ADMIN` | Waiter and staff team member account management and permission role assignment. | `ManagerLayout` |
| `/manager/taxes` | `client/src/pages/ManagerTaxes.tsx` | `MANAGER`, `SUPER_ADMIN` | Tax rate configurations (CGST, SGST, Service Tax, VAT) for restaurant invoicing. | `ManagerLayout` |
| `/manager/settings` | `client/src/pages/ManagerSettings.tsx` | `MANAGER`, `SUPER_ADMIN` | Restaurant profile, opening hours, workflow mode, payment provider, and theme customizer. | `ManagerLayout` |
| `/manager/analytics` | `client/src/pages/ManagerAnalytics.tsx` | `MANAGER`, `SUPER_ADMIN` | Revenue reports, top-selling items, peak ordering hours, and CSV export tools. | `ManagerLayout` |
| `/manager/developer` | `client/src/pages/ManagerDeveloper.tsx` | `MANAGER`, `SUPER_ADMIN` | Developer portal for API key generation, webhook subscriptions, and delivery logs. | `ManagerLayout` |
| `/manager/transactions` | `client/src/pages/ManagerTransactions.tsx` | `MANAGER`, `SUPER_ADMIN` | Transaction history, payment status audit, and order-linked financial logs. | `ManagerLayout` |
| `/manager/profile` | `client/src/pages/ManagerProfile.tsx` | `MANAGER`, `SUPER_ADMIN` | User profile management, name updates, and password change utility. | `ManagerLayout` |

### STAFF
| Route Path | Component File | Allowed Roles | One-Line Description | Layout Wrapper |
|---|---|---|---|---|
| `/manager/orders` | `client/src/pages/ManagerOrders.tsx` | `STAFF` | Live order queue view and order status update interface. | `ManagerLayout` |
| `/manager/counter` | `client/src/pages/ManagerCounter.tsx` | `STAFF` | Counter POS order creation for staff members. | `ManagerLayout` |
| `/manager/kds` | `client/src/pages/ManagerKDS.tsx` | `STAFF` | Kitchen display system view for kitchen staff to tick items and bump tickets. | `ManagerLayout` |
| `/manager/waiter-calls` | `client/src/pages/ManagerWaiterCalls.tsx` | `STAFF` | Floor service requests view to acknowledge and resolve customer table calls. | `ManagerLayout` |
| `/manager/menu/availability` | `client/src/pages/ManagerMenuAvailability.tsx` | `STAFF` | Staff 86ing view — toggle menu item availability without price/edit access. | `ManagerLayout` |
| `/manager/transactions` | `client/src/pages/ManagerTransactions.tsx` | `STAFF` | Payment transaction log view. | `ManagerLayout` |
| `/manager/profile` | `client/src/pages/ManagerProfile.tsx` | `STAFF` | User account settings and password update. | `ManagerLayout` |

### PUBLIC
| Route Path | Component File | Allowed Roles | One-Line Description | Layout Wrapper |
|---|---|---|---|---|
| `/r/:restaurantSlug/t/:tableToken` | `client/src/pages/PublicTable.tsx` | `PUBLIC` | Dine-in QR customer menu, item customization, cart drawer, waiter call, and order checkout. | None |
| `/r/:restaurantSlug/t/:tableToken/order/:orderId` | `client/src/pages/PublicOrderConfirmation.tsx` | `PUBLIC` | Real-time order status tracking page with live socket updates and receipt view. | None |
| `/r/:restaurantSlug/order` | `client/src/pages/PublicSessionlessOrder.tsx` | `PUBLIC` | Takeaway / counter order menu for non-table customers. | None |
| `/login` | `client/src/pages/Login.tsx` | `PUBLIC` | Authentication portal for Super Admin, Manager, and Staff logins. | None |
| `/` | `DashboardRedirect` (`App.tsx:27`) | Authenticated Users | Auto-redirects Super Admin to `/admin/restaurants` and Manager/Staff to `/manager/orders`. | None |

---

## 2. Features per Screen

### `/login` — `Login.tsx`
- **Email input** ([Login.tsx:114](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/Login.tsx#L114)): Form text field for user login email.
- **Password input** ([Login.tsx:135](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/Login.tsx#L135)): Password field with masked entry.
- **Submit button ("Log In")** ([Login.tsx:150](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/Login.tsx#L150)): Submits credentials to POST `/api/v1/auth/login`. Triggers form shake animation on invalid credentials.

### `/admin/restaurants` — `AdminRestaurants.tsx`
- **Tenant View button** ([AdminRestaurants.tsx:254](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L254)): Navigates to `/manager/orders`.
- **Log Out button** ([AdminRestaurants.tsx:276](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L276)): Clears auth session and redirects to `/login`.
- **Search Name / Slug input** ([AdminRestaurants.tsx:365](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L365)): Real-time text filter for restaurant list.
- **Platform Status select filter** ([AdminRestaurants.tsx:376](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L376)): Filter by `ALL`, `ACTIVE`, `SUSPENDED`.
- **Subscription Plan select filter** ([AdminRestaurants.tsx:388](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L388)): Filter by `ALL`, `ACTIVE`, `TRIAL`, `EXPIRED`.
- **"Register Tenant" button** ([AdminRestaurants.tsx:355](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L355)): Opens New Restaurant creation modal.
- **Edit Restaurant button** ([AdminRestaurants.tsx:453](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L453)): Opens Edit Restaurant modal prefilled with target tenant data.
- **Add Manager button** ([AdminRestaurants.tsx:461](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L461)): Opens Create & Assign Manager modal for selected restaurant.
- **Suspend Restaurant button** ([AdminRestaurants.tsx:471](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L471)): Immediately deactivates restaurant tenant.
- **Activate Restaurant button** ([AdminRestaurants.tsx:479](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L479)): Reactivates suspended tenant.
- **New/Edit Restaurant Modal form** ([AdminRestaurants.tsx:553](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L553)): Fields for Name, Slug, Description, Phone, Email, Address, Google Review URL, Subscription Status, Plan Type, and Expiration Date.
- **Create Manager Modal form** ([AdminRestaurants.tsx:722](file:///d:/PIXORA%20STUDIOS%20WEB/the-scan-menu/client/src/pages/AdminRestaurants.tsx#L722)): Fields for Manager Name, Email, and Password.

### `/manager/orders` — `ManagerOrders.tsx`
- **Active Orders / Served History tab toggle**: Switches between active order queue and served order history.
- **Search orders input**: Filters orders by order number, table number, or customer name.
- **Filter by Order Status / Order Mode dropdowns**: Filters active view.
- **Advance Order Status button**: Advances status (`PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`).
- **Item Status Checkbox/Tick button**: Toggles prep status for individual items within an order.
- **Cancel Order button & Confirm modal**: Cancels order with optional cancellation reason.
- **Print Bill Receipt button**: Triggers clean printable thermal receipt modal.
- **Close Table Session button**: Closes table session and clears active table state.

### `/manager/counter` — `ManagerCounter.tsx`
- **Table / Dine-In / Takeaway selector**: Selects destination table or takeaway mode.
- **Category Tabs**: Filters menu items grid by category.
- **Menu Item Grid Card**: Adds selected item to current POS ticket.
- **Quantity (+) and (-) buttons**: Adjusts item quantities in POS cart.
- **Remove item button**: Deletes line item from cart.
- **Customer Note input**: Attaches special kitchen instructions to order.
- **Payment Method radio selector**: Chooses `CASH`, `CARD`, or `UPI`.
- **"Complete POS Order" button**: Submits counter order and prints instant receipt.

### `/manager/kds` — `ManagerKDS.tsx`
- **Station / Category filter tabs**: Filters kitchen tickets by food station.
- **Grid vs List view toggle**: Toggles kitchen display layout.
- **Sound Chime toggle**: Mutes/unmutes kitchen bell.
- **Item status tick button**: Toggles individual item readiness in real time.
- **"Bump Ticket" button**: Marks entire ticket as cooked/ready and removes from active KDS board.

### `/manager/waiter-calls` — `ManagerWaiterCalls.tsx`
- **Filter status tabs (`ALL`, `PENDING`, `ACKNOWLEDGED`, `RESOLVED`)**: Filters call cards.
- **"Acknowledge Call" button**: Marks waiter request as seen (`ACKNOWLEDGED`).
- **"Resolve Call" button**: Clears waiter request (`RESOLVED`).

### `/manager/menu` — `ManagerMenu.tsx`
- **"Add Category" button & Modal form**: Creates new menu category (Name, Sort Order).
- **Edit Category button & Modal form**: Updates existing category name/sort order.
- **Delete Category button & Confirm modal**: Deletes category.
- **Reorder Categories drag action**: Reorders categories via drag handle.
- **"Add Menu Item" button & Modal form**: Creates menu item (Name, Category, Price, Description, Veg/Spicy flags, Prep Time, Track Stock flag, Initial Stock, Low Stock threshold, Add-ons builder).
- **Edit Menu Item button & Modal form**: Modifies item details.
- **Delete Menu Item button & Confirm modal**: Deletes menu item.
- **Toggle Item Availability switch**: Instant 86ing toggle.
- **Adjust Stock Quantity numeric input**: Updates inventory stock count inline.

### `/manager/menu/availability` — `ManagerMenuAvailability.tsx` (Staff View)
- **Search Menu Items input**: Filters items by name.
- **Category filter select**: Filters items by category.
- **Toggle Item Availability switch**: Instant 86ing toggle (restricted view for Staff without price edit permissions).

### `/manager/tables` — `ManagerTables.tsx`
- **Zone Tabs**: Filters tables by floor zone (Indoor, Outdoor Patio, etc.).
- **"Add Zone" button & Modal form**: Creates new dining zone.
- **Edit Zone button & Modal form**: Updates zone name.
- **Delete Zone button & Confirm modal**: Deletes zone.
- **"Add Table" button & Modal form**: Creates single table (Table Number, Display Name, Zone).
- **"Bulk Create Tables" button & Modal form**: Creates multiple tables in a range.
- **Edit Table button & Modal form**: Edits table number and display name.
- **Delete Table button & Confirm modal**: Removes table.
- **Activate / Deactivate Table toggle**: Toggles table active status.
- **"View QR Code" button & Modal**: Previews QR code, provides SVG/PNG download buttons and copy URL link button.
- **"Regenerate QR Token" button & Confirm modal**: Invalidates current table token and generates a fresh token.

### `/manager/staff` — `ManagerStaff.tsx`
- **"Add Staff Member" button & Modal form**: Creates staff user (Name, Email, Password, Role: `STAFF` or `MANAGER`).
- **Edit Staff Member button & Modal form**: Updates staff details and role.
- **Activate / Deactivate Staff switch**: Toggles account status.
- **Delete Staff Member button & Confirm modal**: Removes staff access.

### `/manager/taxes` — `ManagerTaxes.tsx`
- **"Add Tax Rule" button & Modal form**: Creates tax rule (Name, Rate %, Active flag).
- **Edit Tax Rule button & Modal form**: Modifies tax percentage.
- **Delete Tax Rule button & Confirm modal**: Deletes tax rule.
- **Active Tax Rule toggle**: Toggles tax applicability.

### `/manager/settings` — `ManagerSettings.tsx`
- **Workflow Mode selector**: Toggles between `FIVE_STEP`, `FOUR_STEP`, and `THREE_STEP` order workflows.
- **Auto-Accept Orders switch & delay input**: Configures auto-approval delay.
- **Currency select dropdown**: Sets store currency (INR, USD, EUR, etc.).
- **Payment Methods checkboxes**: Toggles Cash, Card, UPI, and Razorpay availability.
- **Petpooja POS Integration toggle & config form**: Configures POS credentials.
- **Restaurant Profile form**: Updates Name, Description, Phone, Email, Address, Opening/Closing hours.
- **Branding & Socials form**: Updates Google Review URL, WhatsApp number, Instagram/Facebook URLs.
- **Theme Color Pickers**: Sets Primary, Secondary, and Accent colors.
- **White Label Config form**: Toggles "Hide Powered by Pixora".
- **"Save Settings" button**: Persists configuration updates.

### `/manager/analytics` — `ManagerAnalytics.tsx`
- **Date Range filter dropdown (`Today`, `7 Days`, `30 Days`, `Custom`)**: Filters data range.
- **Export CSV button**: Downloads revenue and orders dataset.

### `/manager/developer` — `ManagerDeveloper.tsx`
- **API Keys Tab / Webhooks Tab toggle**: Switches between API keys and webhooks panels.
- **"Create API Key" button & Modal form**: Selects key scopes (`menu:read`, `orders:read`, `orders:write`, `webhooks:manage`).
- **Raw API Key copy modal**: Displays generated API key once with copy-to-clipboard button.
- **Revoke API Key button & Confirm modal**: Deletes API key.
- **"Add Webhook" button & Modal form**: Enters target URL and event subscriptions (`order.created`, `order.status_updated`, `inventory.low_stock`).
- **Test Webhook Ping button**: Sends test ping payload.
- **Delete Webhook button & Confirm modal**: Removes webhook subscription.

### `/manager/transactions` — `ManagerTransactions.tsx`
- **Search transaction input**: Filters transaction logs.
- **Date Range filter**: Filters by date range.

### `/manager/profile` — `ManagerProfile.tsx`
- **Name input form**: Updates user profile display name.
- **Change Password form**: Current Password, New Password, Confirm Password fields with submit button.

### `/r/:restaurantSlug/t/:tableToken` — `PublicTable.tsx`
- **Search menu items input**: Real-time search filter.
- **Veg Only toggle switch**: Filters vegetarian items.
- **Category Tabs**: Smooth scroll to menu category sections.
- **Menu Item Card**: Displays image, title, price, veg/spicy badges, description, and add-on selector button.
- **Add to Cart (+) / (-) counter**: Increases or decreases item quantity.
- **Floating Cart Bar**: Displays total items & cart sum; opens Cart Drawer.
- **Cart Slide-up Drawer**: Item list, quantity adjusters, special instructions textarea, customer name & phone inputs, payment method choice (`CASH` vs `RAZORPAY`).
- **"Call Waiter" floating button & Modal**: Triggers waiter assistance alert.
- **"Place Order" button**: Submits order to POST `/api/v1/public/restaurants/:slug/tables/:token/orders` and redirects to Confirmation page.

### `/r/:restaurantSlug/t/:tableToken/order/:orderId` — `PublicOrderConfirmation.tsx`
- **Live Status Step Tracker**: Visual step indicator (`PENDING` -> `PREPARING` -> `READY` -> `SERVED`).
- **Socket.IO live status refresher**: Automatically updates UI when kitchen updates status.
- **Order Summary accordion**: Itemized breakdown with taxes and subtotal.
- **"Call Waiter" assistance button**: Triggers floor service call.
- **"Order More Items" button**: Navigates back to main menu.

### `/r/:restaurantSlug/order` — `PublicSessionlessOrder.tsx`
- **Takeaway Menu interface**: Browse items, add to cart, fill customer contact details, and place takeaway order.

---

## 3. API Inventory

| Method | Endpoint Path | Controller Method | Required Role / Feature Flag | Frontend Caller Page(s) | Status |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | `AuthController.login` | Public | `Login.tsx` | OK |
| `POST` | `/api/v1/auth/refresh` | `AuthController.refresh` | Public | `useAuth.ts` | OK |
| `POST` | `/api/v1/auth/logout` | `AuthController.logout` | Authenticated | `useAuth.ts` | OK |
| `GET` | `/api/v1/auth/me` | `AuthController.me` | Authenticated | `useAuth.ts` | OK |
| `POST` | `/api/v1/auth/change-password` | `AuthController.changePassword` | Authenticated | `ManagerProfile.tsx` | OK |
| `GET` | `/api/v1/admin/stats` | `AdminController.getPlatformStats` | `SUPER_ADMIN` | `AdminDashboard.tsx`, `AdminRestaurants.tsx` | OK |
| `GET` | `/api/v1/admin/analytics` | `AdminController.getPlatformAnalytics` | `SUPER_ADMIN` | `AdminDashboard.tsx`, `AdminAnalytics.tsx` | OK |
| `POST` | `/api/v1/admin/restaurants/provision` | `AdminController.provisionRestaurant` | `SUPER_ADMIN` | `AdminProvision.tsx` | OK |
| `GET` | `/api/v1/admin/restaurants/:id/onboarding` | `AdminController.getOnboardingProgress` | `SUPER_ADMIN` | `AdminRestaurantDetail.tsx` | OK |
| `POST` | `/api/v1/admin/restaurants` | `AdminController.createRestaurant` | `SUPER_ADMIN` | `AdminRestaurants.tsx` | OK |
| `GET` | `/api/v1/admin/restaurants` | `AdminController.listRestaurants` | `SUPER_ADMIN` | `AdminRestaurants.tsx`, `AdminSubscriptions.tsx`, `AdminFeatureFlags.tsx` | OK |
| `GET` | `/api/v1/admin/restaurants/:id` | `AdminController.getRestaurant` | `SUPER_ADMIN` | `AdminRestaurantDetail.tsx` | OK |
| `PATCH` | `/api/v1/admin/restaurants/:id` | `AdminController.editRestaurant` | `SUPER_ADMIN` | `AdminRestaurants.tsx` | OK |
| `PATCH` | `/api/v1/admin/restaurants/:id/suspend` | `AdminController.suspendRestaurant` | `SUPER_ADMIN` | `AdminRestaurants.tsx`, `AdminRestaurantDetail.tsx` | OK |
| `PATCH` | `/api/v1/admin/restaurants/:id/activate` | `AdminController.activateRestaurant` | `SUPER_ADMIN` | `AdminRestaurants.tsx`, `AdminRestaurantDetail.tsx` | OK |
| `DELETE` | `/api/v1/admin/restaurants/:id` | `AdminController.deleteRestaurant` | `SUPER_ADMIN` | `AdminRestaurants.tsx` | OK |
| `POST` | `/api/v1/admin/restaurants/:id/managers` | `AdminController.assignManager` | `SUPER_ADMIN` | `AdminRestaurants.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/feature-flags` | `featureFlagController.getFeatureFlags` | `MANAGER`, `SUPER_ADMIN` | `useFeatureFlags.ts` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/feature-flags` | `featureFlagController.updateFeatureFlags` | `MANAGER`, `SUPER_ADMIN` | `ManagerSettings.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId` | `RestaurantController.getRestaurantProfile` | Authenticated | `ManagerSettings.tsx`, `ManagerProfile.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId` | `RestaurantController.editRestaurantProfile` | `MANAGER`, `SUPER_ADMIN` | `ManagerSettings.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/tables` | `RestaurantController.listTables` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx`, `ManagerCounter.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/tables` | `RestaurantController.createTable` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/tables/bulk` | `RestaurantController.bulkCreateTables` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/tables/:tableId` | `RestaurantController.editTable` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/tables/:tableId` | `RestaurantController.deleteTable` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/tables/:tableId/activate` | `RestaurantController.activateTable` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/tables/:tableId/deactivate` | `RestaurantController.deactivateTable` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/tables/:tableId/regenerate-qr` | `RestaurantController.regenerateTableQr` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/tables/:tableId/qr` | `RestaurantController.getTableQr` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerTables.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/zones` | `RestaurantController.listZones` | `MANAGER`, `SUPER_ADMIN` | `ManagerTables.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/zones` | `RestaurantController.createZone` | `MANAGER`, `SUPER_ADMIN` | `ManagerTables.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/zones/:zoneId` | `RestaurantController.updateZone` | `MANAGER`, `SUPER_ADMIN` | `ManagerTables.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/zones/:zoneId` | `RestaurantController.deleteZone` | `MANAGER`, `SUPER_ADMIN` | `ManagerTables.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/taxes` | `RestaurantController.listTaxes` | `MANAGER`, `SUPER_ADMIN` | `ManagerTaxes.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/taxes` | `RestaurantController.createTax` | `MANAGER`, `SUPER_ADMIN` | `ManagerTaxes.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/taxes/:taxId` | `RestaurantController.updateTax` | `MANAGER`, `SUPER_ADMIN` | `ManagerTaxes.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/taxes/:taxId` | `RestaurantController.deleteTax` | `MANAGER`, `SUPER_ADMIN` | `ManagerTaxes.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/staff` | `RestaurantController.createStaff` | `MANAGER`, `SUPER_ADMIN` | `ManagerStaff.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/staff` | `RestaurantController.listStaff` | `MANAGER`, `SUPER_ADMIN` | `ManagerStaff.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/staff/:staffId` | `RestaurantController.updateStaff` | `MANAGER`, `SUPER_ADMIN` | `ManagerStaff.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/staff/:staffId` | `RestaurantController.deleteStaff` | `MANAGER`, `SUPER_ADMIN` | `ManagerStaff.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/categories` | `MenuController.listCategories` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/categories` | `MenuController.createCategory` | `MANAGER`, `SUPER_ADMIN` | `ManagerMenu.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/categories/:categoryId` | `MenuController.editCategory` | `MANAGER`, `SUPER_ADMIN` | `ManagerMenu.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/categories/:categoryId` | `MenuController.deleteCategory` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/categories-reorder` | `MenuController.reorderCategories` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/menu-items` | `MenuController.listMenuItems` | `MANAGER`, `STAFF`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx`, `ManagerMenuAvailability.tsx`, `ManagerCounter.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/menu-items` | `MenuController.createMenuItem` | `MANAGER`, `SUPER_ADMIN` | `ManagerMenu.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/menu-items/:itemId` | `MenuController.editMenuItem` | `MANAGER`, `SUPER_ADMIN` | `ManagerMenu.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/menu-items/:itemId` | `MenuController.deleteMenuItem` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/menu-items/:itemId/availability` | `MenuController.toggleAvailability` | `MANAGER`, `STAFF`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx`, `ManagerMenuAvailability.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/menu-items/:itemId/stock` | `MenuController.updateStock` | `MenuController.updateStock` | `ManagerMenu.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/menu-items-bulk-availability` | `MenuController.bulkAvailability` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/menu-items-reorder` | `MenuController.reorderMenuItems` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/uploads/signature` | `MenuController.getUploadSignature` | `MANAGER`, `SUPER_ADMIN`, Flag: `qr_menu` | `ManagerMenu.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/orders/analytics` | `OrderController.getAnalytics` | `MANAGER`, `SUPER_ADMIN`, Flag: `ordering` | `ManagerAnalytics.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/orders` | `OrderController.listOrders` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/orders/active` | `OrderController.listActiveOrders` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx`, `ManagerLayout.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/orders/:orderId` | `OrderController.getOrderDetails` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/orders/:orderId/status` | `OrderController.updateOrderStatus` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/orders/:orderId/cancel` | `OrderController.cancelOrder` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/orders/counter` | `OrderController.createCounterOrder` | `MANAGER`, `STAFF`, Flag: `ordering` | `ManagerCounter.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/orders/:orderId/items/:itemIndex/status` | `OrderController.updateItemStatus` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/table-sessions/:sessionId` | `OrderController.getTableSession` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/table-sessions/:sessionId/close` | `OrderController.closeTableSession` | Authenticated, Flag: `ordering` | `ManagerOrders.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/waiter-calls` | `WaiterCallController.listWaiterCalls` | Authenticated | `ManagerWaiterCalls.tsx`, `ManagerLayout.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/waiter-calls/:callId/acknowledge` | `WaiterCallController.acknowledgeWaiterCall` | Authenticated | `ManagerWaiterCalls.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/waiter-calls/:callId/resolve` | `WaiterCallController.resolveWaiterCall` | Authenticated | `ManagerWaiterCalls.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/kds/tickets` | `kdsController.getActiveTickets` | `MANAGER`, `STAFF`, `SUPER_ADMIN`, Flag: `kds` | `ManagerKDS.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/kds/tickets/:orderId/items/:itemIndex/status` | `kdsController.updateItemStatus` | `MANAGER`, `STAFF`, `SUPER_ADMIN`, Flag: `kds` | `ManagerKDS.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/kds/tickets/:orderId/bump` | `kdsController.bumpTicket` | `MANAGER`, `STAFF`, `SUPER_ADMIN`, Flag: `kds` | `ManagerKDS.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics/summary` | `analyticsController.getSummary` | `MANAGER`, `SUPER_ADMIN`, Flag: `analytics` | `ManagerAnalytics.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics/top-items` | `analyticsController.getTopItems` | `MANAGER`, `SUPER_ADMIN`, Flag: `analytics` | `ManagerAnalytics.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics/peak-hours` | `analyticsController.getPeakHours` | `MANAGER`, `SUPER_ADMIN`, Flag: `analytics` | `ManagerAnalytics.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/analytics` | `analyticsController.getOverview` | `MANAGER`, `SUPER_ADMIN`, Flag: `analytics` | `ManagerAnalytics.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/developer/api-keys` | `developerController.listApiKeys` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/developer/api-keys` | `developerController.createApiKey` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/developer/api-keys/:keyId` | `developerController.revokeApiKey` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/developer/webhooks` | `developerController.listWebhooks` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/developer/webhooks` | `developerController.createWebhook` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `DELETE` | `/api/v1/restaurants/:restaurantId/developer/webhooks/:webhookId` | `developerController.deleteWebhook` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/developer/webhooks/:webhookId/test` | `developerController.testWebhookPing` | `MANAGER`, `SUPER_ADMIN`, Flag: `api_webhooks` | `ManagerDeveloper.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/integrations/sync-logs` | `integrationController.getSyncLogs` | `MANAGER`, `SUPER_ADMIN`, Flag: `pos_integration` | `ManagerSettings.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/integrations/config` | `integrationController.getIntegrationConfig` | `MANAGER`, `SUPER_ADMIN`, Flag: `pos_integration` | `ManagerSettings.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/integrations/petpooja/config` | `integrationController.updatePetpoojaConfig` | `MANAGER`, `SUPER_ADMIN`, Flag: `pos_integration` | `ManagerSettings.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/integrations/petpooja/sync-menu` | `integrationController.triggerMenuSync` | `MANAGER`, `SUPER_ADMIN`, Flag: `pos_integration` | `ManagerSettings.tsx` | OK |
| `POST` | `/api/v1/restaurants/:restaurantId/payments/intent` | `paymentController.createIntent` | Authenticated, Flag: `payments` | None | **ORPHANED** |
| `GET` | `/api/v1/restaurants/:restaurantId/payments/transactions` | `paymentController.listTransactions` | Authenticated, Flag: `payments` | `ManagerTransactions.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/payments/transactions/:id` | `paymentController.getTransaction` | Authenticated, Flag: `payments` | None | **ORPHANED** |
| `PATCH` | `/api/v1/restaurants/:restaurantId/payments/config` | `paymentController.updateConfig` | `MANAGER`, `SUPER_ADMIN`, Flag: `payments` | `ManagerSettings.tsx` | OK |
| `GET` | `/api/v1/subscriptions` | `subscriptionController.getAllPlans` | Authenticated | `ManagerSettings.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/subscription` | `subscriptionController.getRestaurantPlan` | Authenticated | `ManagerSettings.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/subscription` | `subscriptionController.assignPlan` | `SUPER_ADMIN` | `AdminRestaurants.tsx` | OK |
| `GET` | `/api/v1/restaurants/:restaurantId/white-label` | `whiteLabelController.getConfig` | `MANAGER`, `SUPER_ADMIN`, Flag: `white_label` | `ManagerSettings.tsx` | OK |
| `PATCH` | `/api/v1/restaurants/:restaurantId/white-label` | `whiteLabelController.updateConfig` | `MANAGER`, `SUPER_ADMIN`, Flag: `white_label` | `ManagerSettings.tsx` | OK |
| `GET` | `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken` | `PublicController.resolveTable` | Public | `PublicTable.tsx` | OK |
| `GET` | `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/menu` | `PublicController.getMenu` | Public | `PublicTable.tsx` | OK |
| `GET` | `/api/v1/public/restaurants/:restaurantSlug/menu` | `PublicController.getSessionlessMenu` | Public | `PublicSessionlessOrder.tsx` | OK |
| `GET` | `/api/v1/public/restaurants/:restaurantId/taxes` | `PublicController.getTaxes` | Public | `PublicTable.tsx` | OK |
| `POST` | `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/orders` | `PublicController.createOrder` | Public | `PublicTable.tsx` | OK |
| `POST` | `/api/v1/public/restaurants/:restaurantSlug/orders` | `PublicController.createSessionlessOrder` | Public | `PublicSessionlessOrder.tsx` | OK |
| `POST` | `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/payments/intent` | `PublicController.createPaymentIntent` | Public | `PublicTable.tsx` | OK |
| `POST` | `/api/v1/public/restaurants/:restaurantSlug/payments/intent` | `PublicController.createPaymentIntent` | Public | `PublicSessionlessOrder.tsx` | OK |
| `POST` | `/api/v1/public/restaurants/:restaurantSlug/tables/:tableToken/clear-session` | `PublicController.clearTableSession` | Public | `PublicTable.tsx` | OK |
| `GET` | `/api/v1/public/orders/:orderId` | `PublicController.getOrder` | Public | `PublicOrderConfirmation.tsx` | OK |
| `GET` | `/api/v1/public/orders/:orderId/status` | `PublicController.getOrderStatus` | Public | `PublicOrderConfirmation.tsx` | OK |
| `GET` | `/api/v1/public/table-sessions/:sessionId` | `PublicController.getTableSession` | Public | `PublicTable.tsx` | OK |
| `POST` | `/api/v1/public/tables/:tableToken/waiter-call` | `WaiterCallController.createWaiterCall` | Public | `PublicTable.tsx`, `PublicOrderConfirmation.tsx` | OK |
| `GET` | `/api/v1/public/tables/:tableToken/waiter-call/active` | `WaiterCallController.getActiveWaiterCall` | Public | `PublicTable.tsx` | OK |
| `GET` | `/api/v1/public/white-label/domain/:domain` | `whiteLabelController.getByDomain` | Public | None | **ORPHANED** |
| `POST` | `/api/v1/webhooks/razorpay` | `paymentController.handleRazorpayWebhook` | Public (Webhook Signature) | External Razorpay Webhook | OK |
| `POST` | `/api/v1/webhooks/petpooja` | `petpoojaWebhookController.handleWebhook` | Public (POS Webhook) | External Petpooja Webhook | OK |

---

## 4. Test Login Credentials

| Role | Email | Password | Allowed Access / Scope |
|---|---|---|---|
| `SUPER_ADMIN` | `admin@pixora.dev` | `PixoraDemo123!` | Global platform access, `/admin/restaurants`, subscription assignment, tenant creation & suspension. |
| `MANAGER` | `manager@democafe.com` | `PixoraDemo123!` | Full manager operations for "Demo Cafe", `/manager/*` routes (Orders, Menu, Tables, Staff, Taxes, Settings, Analytics, Developer). |
| `STAFF` | `staff1@democafe.com` | `PixoraDemo123!` | Staff operations for "Demo Cafe", restricted to `/manager/orders`, `/manager/counter`, `/manager/kds`, `/manager/waiter-calls`, `/manager/menu/availability`, `/manager/profile`. |
| `STAFF` | `staff2@democafe.com` | `PixoraDemo123!` | Second staff account for "Demo Cafe". |
| `PUBLIC` | N/A (QR scan) | N/A | Dine-in customer view via Table 1 Token: `http://localhost:5173/r/demo-cafe/t/secureTableTokenDemoCafeZone6992ad345bc12ef098765432Number1XYZ` |

---

## 5. Multi-Step / Cross-Role Flows

### Flow 1: Super Admin Provisions Tenant & Assigns Manager
1. **Role: `SUPER_ADMIN`** -> Navigates to `/login`, logs in with `admin@pixora.dev`.
2. **Role: `SUPER_ADMIN`** -> Lands on `/admin/restaurants`, clicks "Register Tenant".
3. **Role: `SUPER_ADMIN`** -> Submits tenant form for "New Bistro", selects `ENTERPRISE` plan.
4. **Role: `SUPER_ADMIN`** -> Clicks "Add Manager" on "New Bistro" tenant card, creates manager `bistro_mgr@test.com`.
5. **Role: `MANAGER`** -> Log out Super Admin, log in as `bistro_mgr@test.com` -> redirected to `/manager/orders`.

### Flow 2: Manager Configures Restaurant Menu, Taxes & Table QRs
1. **Role: `MANAGER`** -> Log in as `manager@democafe.com`.
2. **Role: `MANAGER`** -> Navigate to `/manager/taxes`, create CGST (2.5%) and SGST (2.5%).
3. **Role: `MANAGER`** -> Navigate to `/manager/tables`, create "VIP Zone" and add Table 1. View QR code token.
4. **Role: `MANAGER`** -> Navigate to `/manager/menu`, create "Beverages" category, add "Iced Latte" item ($4.50) with stock tracking enabled.

### Flow 3: Customer Places QR Order -> Kitchen Preps -> Staff Serves
1. **Role: `PUBLIC`** -> Customer opens QR URL `/r/demo-cafe/t/secureTableToken...` in browser.
2. **Role: `PUBLIC`** -> Adds "Madras Filter Coffee" to cart, enters customer name "Alice", clicks "Place Order".
3. **Role: `PUBLIC`** -> Redirected to `/r/demo-cafe/t/secureTableToken.../order/:orderId` confirmation screen with live status tracker (`PENDING`).
4. **Role: `STAFF` / `MANAGER`** -> Logged in on `/manager/orders` or `/manager/kds`. Instant Socket.IO chime triggers new order card #105.
5. **Role: `STAFF`** -> On `/manager/kds`, kitchen staff ticks item status to `PREPARING` -> Customer confirmation screen updates to `PREPARING` in real time.
6. **Role: `STAFF`** -> Kitchen bumps ticket (`READY`) -> Manager/Staff marks order as `SERVED` on `/manager/orders`. Customer confirmation screen updates to `SERVED`.

### Flow 4: Customer Calls Waiter -> Staff Resolves Floor Request
1. **Role: `PUBLIC`** -> Customer clicks floating "Call Waiter" button on `/r/demo-cafe/t/secureTableToken...`.
2. **Role: `STAFF`** -> Staff on `/manager/waiter-calls` receives instant audio chime + toast notification for Table 1 call.
3. **Role: `STAFF`** -> Clicks "Acknowledge Call" -> status updates to `ACKNOWLEDGED`.
4. **Role: `STAFF`** -> Attends to customer and clicks "Resolve Call" -> call card removed from pending queue.

### Flow 5: Staff 86s Menu Item -> Instant Customer Menu Update
1. **Role: `STAFF`** -> Staff logs in as `staff1@democafe.com` -> visits `/manager/menu/availability`.
2. **Role: `STAFF`** -> Toggles "Nutella Mocha Latte" availability switch to OFF.
3. **Role: `PUBLIC`** -> Customer refreshing `/r/demo-cafe/t/secureTableToken...` sees "Nutella Mocha Latte" marked as "Sold Out" / disabled for ordering.
