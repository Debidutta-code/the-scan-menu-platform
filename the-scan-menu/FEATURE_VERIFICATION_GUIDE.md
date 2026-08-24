# 🚀 Feature UI Verification & Manual Testing Guide

This guide gives you a step-by-step walkthrough of how to access, test, and verify every newly implemented feature through the Web UI and API.

---

## 🔐 Credentials & Quick Access

* **Super Admin**: `superadmin@gmail.com` / `Test@1234` (PIN: `1234`)
* **Demo Cafe Manager**: `manager@democafe.com` / `Test@1234` (PIN: `1234`)
* **Staff 1**: `staff1@democafe.com` / `Test@1234` (PIN: `1234`)
* **Default PIN for Fast Unlock**: `1234`
* **Demo Public Menu**: `/r/demo-cafe`
* **Live TV Display**: `/r/demo-cafe/display`

---

## 📋 Feature Breakdown & UI Navigation

---

### 1. ⇄ Table Transfer & Merge Sessions

**What it does**: Moves all active orders and guest sessions from one table to another, or merges multiple source tables into a single master dining session.

#### How to access from UI:
1. Log in as **Demo Manager** (`manager@democafe.com`).
2. Go to **Sidebar → Tables** (`/manager/tables`) or **Sidebar → POS Counter** (`/manager/pos`).
3. You will find:
   - **Header Button**: Click the top right **`[⇄ Transfer / Merge]`** button.
   - **Card Shortcut**: On any occupied table badge (e.g. Table 1, 2, 3), click the **`⇄`** icon directly.
   - **Table Action Popup**: Click on an occupied table card → In the popup modal, click **`[Transfer / Merge Table Session]`**.

#### What to test & Expected Reaction:
* **Transfer Mode**:
  1. Select **Transfer** action.
  2. Select Source Table (e.g., *T1 - Indoor*).
  3. Select Destination Table (e.g., *T5 - Patio*).
  4. Click **`[Confirm Transfer]`**.
  5. **Expected result**: Toast notification `Table session successfully transferred!`. Table 1 becomes vacant, Table 5 becomes occupied with the exact same active bill and guest cart.
* **Merge Mode**:
  1. Select **Merge** action.
  2. Check multiple occupied source tables.
  3. Select destination primary table.
  4. Click **`[Merge Table Sessions]`**.
  5. **Expected result**: Orders merge into one consolidated dining session.

**Underlying APIs**:
* `POST /api/v1/restaurants/:restaurantId/tables/transfer`
* `POST /api/v1/restaurants/:restaurantId/tables/merge`

---

### 2. 💵 Shift Management, Cash Drawer & X/Z Day Close Reports

**What it does**: Full POS shift tracking with opening cash float, cash in / cash out petty cash tracking, mid-shift X-Report, and end-of-day Z-Report with cash difference calculations.

#### How to access from UI:
1. Log in as **Demo Manager** (`manager@democafe.com`).
2. Go to **Sidebar → Counter POS** (`/manager/pos`).
3. In the top-right header, look at the **Shift Status Badge**:
   - `🟢 Shift #102 • ₹3,300.00` (When shift is active)
   - `🔴 Shift Closed • Click to Open` (When shift is closed)
4. Click on this badge to open the **Shift Management Modal**.

#### What to test & Expected Reaction:
* **Cash In / Cash Out (Petty Cash)**:
  1. Select **Cash Movement** tab.
  2. Choose `+ Cash In` (Top-up) or `- Cash Out` (Expense).
  3. Enter amount (e.g., `100`) and choose Category (`Supplies`, `Vendor Payout`, `Float Topup`).
  4. Enter reason (e.g., `Purchased fresh lemons`) and click **`[Record Cash Movement]`**.
  5. **Expected result**: Expected cash in drawer instantly updates and logs under petty cash history.
* **Mid-Shift X-Report**:
  1. Click the **`[X-Report Summary]`** button.
  2. **Expected result**: Displays live breakdown of Cash Sales, Card Sales, UPI Sales, Petty Cash net, and Current Expected Cash.
* **Shift Close (Z-Report)**:
  1. Go to **Close Shift** tab.
  2. Enter physical cash counted in drawer.
  3. The system calculates any **Overage (+)** or **Shortage (-)**.
  4. Enter optional closing notes and click **`[Close Shift & Generate Z-Report]`**.
  5. **Expected result**: Shift transitions to `CLOSED`, prints/displays the official Z-Report, and prompts for next shift opening float.

**Underlying APIs**:
* `GET /api/v1/restaurants/:restaurantId/shifts/active`
* `POST /api/v1/restaurants/:restaurantId/shifts/open`
* `POST /api/v1/restaurants/:restaurantId/shifts/petty-cash`
* `POST /api/v1/restaurants/:restaurantId/shifts/close`
* `GET /api/v1/restaurants/:restaurantId/shifts/history`

---

### 3. 🍕 Reusable Modifier & Add-on Groups

**What it does**: Allows creating reusable customization groups (e.g. *Choice of Crust*, *Extra Dips & Sauces*, *Beverage Additions*) with single/multi selection rules, min/max limits, and attaching them to any menu item.

#### How to access from UI:
1. Go to **Sidebar → Menu Management** (`/manager/menu`).
2. **Modifier Group Management**:
   - Click the top tab **`[Customizations]`**.
   - Here you can view existing groups:
     - `Choice of Crust` (*Single selection, Required*)
     - `Extra Dips & Sauces` (*Multi selection, 0 to 3*)
     - `Cheese & Gourmet Toppings` (*Multi selection, 0 to 5*)
     - `Coffee & Beverage Additions` (*Multi selection, 0 to 3*)
   - Click **`[+ Create Add-on Group]`** to create new reusable groups with option prices.
3. **Attaching Modifiers to Dishes**:
   - Switch back to tab **`[Dishes]`**.
   - Click **`[+ Add Dish]`** or click **Edit** on any dish (e.g. *Truffle Margherita Pizza*).
   - Scroll down to the **"Reusable Modifier & Add-on Groups"** card section.
   - Toggle/check the modifier groups to attach them to this dish.
   - Click **`[Save Item]`**.
4. **Ordering Experience**:
   - Go to **Counter POS** (`/manager/pos`) or **Public Menu** (`/r/demo-cafe`).
   - Click on the customized dish.
   - **Expected result**: The modifier modal appears with single/multi selection badges, price deltas, and min/max validation rules.

**Underlying APIs**:
* `GET /api/v1/restaurants/:restaurantId/customization-groups`
* `POST /api/v1/restaurants/:restaurantId/customization-groups`
* `PATCH /api/v1/restaurants/:restaurantId/customization-groups/:groupId`
* `DELETE /api/v1/restaurants/:restaurantId/customization-groups/:groupId`

---

### 4. 🖨️ Direct Network Thermal Printing (Silent ESC/POS over TCP port 9100)

**What it does**: Direct raw ESC/POS thermal printing to LAN printers over port 9100 without browser print dialogues, supporting kitchen KOTs and customer bills.

#### How to access from UI:
1. Go to **Sidebar → Settings** (`/manager/settings`).
2. Scroll to **Section 5: Direct Network Thermal Printing (ESC/POS)**.

#### What to test & Expected Reaction:
1. Toggle **`Silent Direct Printing`** switch.
2. Verify configured IP and Port fields:
   - **Kitchen Printer**: `192.168.1.105` : `9100`
   - **Counter Printer**: `192.168.1.100` : `9100`
3. Click **`[Send Test Slip]`** under Kitchen or Counter printer.
4. **Expected result**: System initiates a TCP socket connection to the specified IP and sends binary ESC/POS test commands with restaurant branding.
5. Click **`[Save Printer Configuration]`** to update restaurant settings.

**Underlying APIs**:
* `POST /api/v1/restaurants/:restaurantId/printers/test`
* `POST /api/v1/restaurants/:restaurantId/printers/kot`
* `PATCH /api/v1/restaurants/:restaurantId/settings`

---

### 5. 🎁 Customer Loyalty Points, Rewards & Ledger History

**What it does**: Tracks customer loyalty points, calculates tier levels (*Bronze*, *Silver*, *Gold*, *Platinum*), allows manual staff adjustments with reason notes, and keeps an immutable audit ledger.

#### How to access from UI:
1. Go to **Sidebar → Customers** (`/manager/customers`).
2. View the customer list with seeded customers:
   - **Alice Johnson**: `420 pts` • `GOLD Tier`
   - **Rahul Sharma**: `280 pts` • `SILVER Tier`
   - **Priya Patel**: `150 pts` • `BRONZE Tier`
3. Click on **Alice Johnson** or **Rahul Sharma** to open their Customer Profile drawer.

#### What to test & Expected Reaction:
* **Loyalty Status Card**: Displays total points, current tier badge, and redeemable rupee balance (e.g. `₹210.00`).
* **Adjust Points Form**:
  1. Select **`[+ Credit Points]`** or **`[- Debit Points]`**.
  2. Enter Points to adjust (e.g. `50`).
  3. Enter reason note (e.g. `Special Anniversary Bonus`).
  4. Click **`[Apply Points Adjustment]`**.
  5. **Expected result**: Customer balance updates immediately.
* **Points History Ledger**:
  1. Look at the **Loyalty Points Ledger** table below.
  2. **Expected result**: Displays the new adjustment along with previous transactions (`Welcome Signup Bonus`, `Dine-in Cashback`), complete with timestamps, point diffs (`+50 pts`), and running balances.

**Underlying APIs**:
* `GET /api/v1/restaurants/:restaurantId/customers/:customerId/loyalty`
* `POST /api/v1/restaurants/:restaurantId/customers/:customerId/loyalty/adjust`
* `GET /api/v1/restaurants/:restaurantId/customers/:customerId/loyalty/ledger`

---

### 6. 🚩 Feature Flags & Permissions Engine

**What it does**: Allows toggling any of the 17 core system modules per restaurant with instant caching and endpoint protection.

#### How to access from UI:
1. Log in as **Super Admin** (`superadmin@gmail.com`).
2. Go to **SuperAdmin Sidebar → Feature Flags** (`/admin/feature-flags`).
3. Select **Demo Cafe** from the outlet dropdown.
4. You will see all 17 feature flags divided into 5 categories:
   - **Guest Experience**: `qr_menu`, `ordering`, `waiter_call`, `customer_display`
   - **Operations & Kitchen**: `kds`, `inventory`, `pos`, `takeaway`, `delivery`
   - **Finance & Billing**: `payments`, `analytics`
   - **Marketing & Growth**: `coupons`, `loyalty`, `crm`
   - **Integrations & Dev**: `pos_integration`, `api_access`, `white_label`

#### What to test & Expected Reaction:
1. Toggle off a feature (e.g. `kds` or `inventory`).
2. Click **`[Save Changes]`**.
3. Open manager session for Demo Cafe → Notice the disabled menu tab vanishes from the sidebar and any direct URL navigation is blocked by `FeatureProtectedRoute`.
4. Turn it back on in SuperAdmin → The tab instantly reappears.

**Underlying APIs**:
* `GET /api/v1/restaurants/:restaurantId/feature-flags`
* `PATCH /api/v1/restaurants/:restaurantId/feature-flags`

---

## 📱 Summary Checklist Table

| Feature | Primary URL Route | Entry Point in UI |
| :--- | :--- | :--- |
| **Table Transfer / Merge** | `/manager/tables` & `/manager/pos` | Top header `[⇄ Transfer / Merge]` button & occupied table card `⇄` shortcut |
| **Shift Management & Cash Drawer** | `/manager/pos` | Top-right header shift status badge (`🟢 Shift #102`) |
| **Modifier / Add-on Groups** | `/manager/menu` | Top tab `[Customizations]` & dish edit modal |
| **Thermal Network Printer** | `/manager/settings` | Settings Section 5 `Direct Network Thermal Printing` |
| **Customer Loyalty & Ledger** | `/manager/customers` | Customer list → Click customer profile drawer |
| **Feature Flags Management** | `/admin/feature-flags` | SuperAdmin Sidebar → `Feature Flags` |
| **Kitchen KDS Station** | `/manager/kds` | Sidebar → `Kitchen (KDS)` |
| **Customer Live Queue TV** | `/r/demo-cafe/display` | Sidebar → `Live TV Display ↗` |
