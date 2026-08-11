# Failure Management Matrix (V2.1)

| Failure Scenario | Database State | Customer UX | Manager POS View | Recovery Engine |
| :--- | :--- | :--- | :--- | :--- |
| **Prepaid Payment Fails** | `CheckoutAttempt: PAYMENT_FAILED` | "Payment failed. Please retry." | Zero kitchen tickets | Cart preserved; customer retries payment. |
| **Payment Captured, Browser Crashes** | `CheckoutAttempt: PAYMENT_SUCCESS` -> `Order: PAID` | Reconnects to live order tracking | Ticket appears in KDS queue | Gateway webhook processes order asynchronously. |
| **Duplicate Webhook Delivery** | `CheckoutAttempt: ORDER_CREATED` | Normal view | Normal view | Atomic lock skips duplicate execution; returns HTTP 200. |
| **Customer Leaves Unpaid (Walkout)** | `DiningSession: ACTIVE, balanceDue > 0` | Session ends on tab close | Highlighted table alert on Floor Map | Manager marks `ABANDONED` to record bad debt and free table. |
| **New Customer on Unbussed Table** | `DiningSession: ACTIVE` (previous party) | Safety screen: "Ongoing meal" | Alert: "New scan on unpaid table" | Staff settles or archives old session; clean session opens. |
| **POS Network Outage** | `Order.posSyncStatus: FAILED` | Normal tracking | "POS Sync Pending" badge | Exponential backoff retry worker enqueues ticket for automatic sync. |
