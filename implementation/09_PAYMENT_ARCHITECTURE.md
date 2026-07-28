# Payment Architecture

TheScanMenu is designed to handle multiple ordering rounds culminating in a single payment event, though it is architecturally prepared for pay-per-order flows.

## Current State: Session-Based Billing

Currently, the platform does not process live digital transactions. It acts as a digital ledger and operational tool.

1.  **Table Sessions**: A `TableSession` represents the customer's visit.
2.  **Order Accumulation**: Multiple `Order` documents are attached to a single `TableSession`.
3.  **Bill Settlement**: When a manager or staff member hits "Settle Bill", the `TableSession` is marked `CLOSED`, and all associated `Order`s have their `paymentStatus` updated from `PENDING` to `PAID`.
4.  **Taxes**: The system calculates taxes based on the active `Tax` models associated with the restaurant, summing them up for a total bill view in the cart and on the manager's dashboard.

## Future Architecture: Gateway Integrations

The database schema (`Restaurant.paymentOptions`) already anticipates integrations with gateways like Razorpay, Stripe, or Square.

### Implementation Strategy

1.  **Adapter Pattern**: Similar to POS integrations, payment processing should be abstracted behind a `PaymentProvider` interface.
2.  **Checkout Flow**:
    *   Customer initiates checkout.
    *   Backend creates a transaction intent with the selected provider (e.g., a Razorpay Order ID) and returns it to the client.
    *   Client uses the provider's SDK (e.g., Razorpay Checkout JS) to capture payment.
3.  **Webhooks**: **Crucial.** The backend must expose secure webhook endpoints to receive asynchronous payment confirmations from the provider.
4.  **Reconciliation**: The webhook handler will verify the signature, find the associated `TableSession` or `Order`, and update the `paymentStatus` to `PAID`, triggering Socket.IO events to update the staff dashboard automatically.
