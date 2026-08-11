# Payment & Checkout Architecture (V2.1)

## 1. Prepaid Architecture (`CheckoutAttempt`)
- **Durable Persistence:** The customer's cart is snapshotted into MongoDB inside a `CheckoutAttempt` document with status `PAYMENT_PENDING`.
- **Atomic Gateway Lock:** Webhook and frontend callbacks execute an atomic `$set: { status: 'PAYMENT_SUCCESS' }` on the attempt.
- **Order Dispatch:** Upon verified payment capture, the system atomically inserts the immutable `Order` (status: `PENDING`, `paymentStatus: 'PAID'`), creates a `Payment` record, and dispatches the ticket to KDS.
- **Zero Ghost Tickets:** Failed or abandoned payments never produce dummy orders in the kitchen.

## 2. Postpaid Architecture (Versioned `Bill`)
- Orders accumulate under `DiningSession` with `paymentStatus: 'PENDING'`.
- Customer or staff generates a `Bill` (e.g. Version 1).
- If the customer orders additional items before settling, Version 1 is marked `SUPERSEDED` and Version 2 is generated.
- Multi-tender payments (Cash + UPI + Card) are supported against the bill until `balanceDue === 0`, at which point the bill and session transition to `SETTLED`.
