# POS Integration Architecture

A key selling point of TheScanMenu is its ability to integrate seamlessly with existing Point-Of-Sale (POS) systems (e.g., Petpooja, UrbanPiper, Square) so that QR orders appear directly in the restaurant's existing workflows.

## The Adapter Pattern

The integration layer (`server/src/integrations/`) is built using a strict Adapter pattern to decouple the core application logic from third-party vendor APIs.

### 1. `RestaurantIntegration` Interface
Defines the mandatory contract every POS integration must fulfill:
*   `syncMenu()`: Pull menu data from the POS into TheScanMenu.
*   `pushOrder()`: Send a new QR order from TheScanMenu into the POS.
*   `updateOrderStatus()`: Update the state of an order in the POS.

### 2. `IntegrationFactory`
Acts as a resolver. When a service needs to communicate with a POS, it calls the factory, passing the restaurant's configuration. The factory instantiates and returns the correct adapter class.

```typescript
// Conceptual example
const integration = IntegrationFactory.getIntegration(restaurant.integrationConfig);
await integration.pushOrder(orderData);
```

### 3. Adapters
Currently, the system defaults to a `NoOpIntegration` (which does nothing but resolve promises) and has stubs for future integrations (`FuturePetpoojaIntegration`, `FutureUrbanPiperIntegration`) that throw `NotImplementedError`s.

## Asynchronous Communication

POS integrations are inherently unstable (network issues, API downtime). TheScanMenu architecture demands that third-party communication **must not block** core application flows.

### Implementation Strategy:
1.  **Non-Blocking**: When a customer places an order, the primary flow must save the order to the local MongoDB and return success to the customer immediately.
2.  **Sync Log**: A record is created in the `IntegrationSyncLog` collection.
3.  **Background Processing**: The actual API call to the POS (`integration.pushOrder()`) should happen asynchronously (e.g., via an Event Emitter or a message queue like Redis/Bull in the future).
4.  **Failure Handling**: If the push fails, the `IntegrationSyncLog` is updated with the error, allowing for retry mechanisms or alerting managers that an order needs manual entry.
