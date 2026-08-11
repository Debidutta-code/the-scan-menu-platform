# Dining Session & Multi-Guest Architecture (V2.1)

## 1. Dining Session Lifecycle

A `DiningSession` represents the continuous visit of a dining group.

### States:
* `ACTIVE`: Session is open and receiving orders.
* `BILL_REQUESTED`: Customer or staff requested settlement; ordering locked unless reopened.
* `SETTLED`: Bill paid in full (`balanceDue === 0`).
* `CLOSED`: Table bussed and freed for next guests.
* `ABANDONED`: Walkout / uncollectible bad debt declared by manager with mandatory reason.

### Hard Boundary Rules:
* **No Inactivity Closure:** Diners can sit for hours without being kicked out.
* **Auto-Settlement on Zero Balance:** If a prepaid session is fully paid and all items are served, a new QR scan by an unknown device safely archives the old session and starts a new session without manual staff effort.
* **New Party Protection:** If an unpaid postpaid session exists, an unknown device cannot access or mutate the previous party's bill. The screen presents: *"Table has an ongoing meal"*, allowing joining with a 4-digit PIN or alerting staff to resolve a walkout.

## 2. Guest Sessions & Device Tokens
* `GuestSession` tracks individual devices via signed `guestTokens`.
* Distinguishes "My Orders" vs. "Table Orders".
* Anonymous dining is supported by default.
