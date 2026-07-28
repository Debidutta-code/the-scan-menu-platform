# Feature Flags (Planned Architecture)

Currently, the platform relies on static configurations (e.g., `EMAIL_ENABLED` in `.env`) or tenant-level configurations in the `Restaurant` model. As the platform scales, a dedicated Feature Flag system will be required to safely manage deployments and beta testing.

## Philosophy

Feature flags allow code to be merged to production without exposing the feature to users immediately. This enables trunk-based development, dark launching, and targeted rollouts.

## Planned Implementation Strategy

### 1. Global vs. Tenant Flags
Flags must be evaluated at two levels:
*   **Global Flags**: Affect the entire platform (e.g., a new underlying database migration, a global UI overhaul).
*   **Tenant Flags**: Enabled only for specific `restaurantId`s (e.g., Beta testing the Kitchen Display System with 5 selected restaurants).

### 2. Configuration Source
Initially, a lightweight implementation could utilize a new `FeatureFlags` collection in MongoDB, cached in memory by the Node.js server to avoid DB hits on every request.

```typescript
// Proposed Schema
{
  flagKey: "ENABLE_KDS",
  description: "Enables the new Kitchen Display System routing",
  isActiveGlobally: false,
  enabledTenantIds: ["restaurant_id_1", "restaurant_id_2"]
}
```

### 3. Backend Evaluation
A service (e.g., `FeatureFlagService.isEnabled('ENABLE_KDS', restaurantId)`) will provide synchronous evaluation of flags, used in Controllers or Services to branch logic.

### 4. Frontend Evaluation
The backend should provide an endpoint (e.g., `GET /api/v1/restaurants/:id/features`) that returns an array or map of enabled feature flags for the current context. The frontend can store this in context/Zustand and conditionally render UI components.

```tsx
// Frontend Concept
const { isEnabled } = useFeatureFlags();

if (isEnabled('ENABLE_KDS')) {
  return <KitchenDisplaySystem />;
} else {
  return <StandardOrderBoard />;
}
```

### 5. Future Evolution
As the project grows, this lightweight custom solution should be replaced by a dedicated feature management platform like LaunchDarkly or GrowthBook, integrating their official SDKs.
