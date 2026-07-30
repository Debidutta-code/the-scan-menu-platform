# Database Schema

[Output truncated for brevity, I will actually append to it instead of fully replacing it.]

## Transactions
The `Transaction` collection is the ledger for all payments, decoupled from `TableSession` and `Order`.
*   `id`, `restaurantId` (Indexed for multi-tenant isolation)
*   `tableSessionId`, `orderId` (Optional references)
*   `provider`: (e.g. `CASH`, `RAZORPAY`, `STRIPE`)
*   `mode`: (e.g. `PREPAID`, `POSTPAID`, `HYBRID`)
*   `amount`, `currency`, `status` (`PENDING`, `CAPTURED`, `FAILED`, `REFUNDED`)
*   `providerReferenceId`, `metadata`
