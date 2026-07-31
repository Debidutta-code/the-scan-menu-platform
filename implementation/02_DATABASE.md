# Database Schema

Refer to docs/DATABASE.md for the full schema.

## Security & Credentials
App-wide AES-256-GCM encryption (via `ENCRYPTION_KEY`) is used to store sensitive tenant configuration secrets like `keySecret` and `webhookSecret` in `RestaurantSettings`.

## Transactions
The `Transaction` collection is the ledger for all payments, decoupled from `TableSession` and `Order`.
*   `id`, `restaurantId` (Indexed for multi-tenant isolation)
*   `tableSessionId`, `orderId` (Optional references)
*   `provider`: (e.g. `CASH`, `RAZORPAY`, `STRIPE`)
*   `mode`: (e.g. `PREPAID`, `POSTPAID`, `HYBRID`)
*   `amount`, `currency`, `status` (`PENDING`, `CAPTURED`, `FAILED`, `REFUNDED`)
*   `providerReferenceId`, `metadata`
