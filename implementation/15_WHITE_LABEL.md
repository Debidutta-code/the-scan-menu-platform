# 15_WHITE_LABEL.md - White Label & Enterprise Branding Specification

## Overview
Phase 14 introduces production-grade White Label capabilities for Enterprise tenants on **The Scan Menu**. Enterprise restaurants can completely customize their public customer menu screens (`PublicTable.tsx`, `PublicSessionlessOrder.tsx`) and Manager Dashboard branding with custom CSS variables (primary, secondary, background, text colors), custom font families, custom logos, custom favicons, domain mapping resolution (`customDomain`), and optional hiding of the "Powered by The Scan Menu" attribution badge.

---

## Technical Architecture

```
                                +-----------------------------------+
                                |    Enterprise Manager Dashboard   |
                                |     (/manager/settings UI)        |
                                +-----------------------------------+
                                                  |
                                                  v
                               PATCH /api/v1/restaurants/:id/white-label
                                (Gated by 'white_label' Feature Flag)
                                                  |
                                                  v
                               +------------------------------------+
                               |        RestaurantSettings          |
                               |    .whiteLabelConfig collection    |
                               +------------------------------------+
                                                  |
                      +---------------------------+---------------------------+
                      |                                                       |
                      v                                                       v
         Custom Domain Lookup                                  Public Digital Menu
  GET /api/v1/public/white-label/domain/:domain              useWhiteLabelTheme Hook
      (Sparse indexed query)                           (Injects CSS vars, fonts & custom favicon)
```

---

## Data Schema

### `RestaurantSettings.whiteLabelConfig` Subdocument

```ts
export interface IRestaurantSettingsWhiteLabel {
  enabled: boolean;            // Master toggle for white label branding
  customDomain?: string;       // Custom hostname (e.g. "menu.gourmetbistro.com") - Sparse Unique Indexed
  logoUrl?: string;            // Custom brand logo URL
  faviconUrl?: string;         // Custom favicon image URL
  primaryColor?: string;       // Primary brand accent color (hex/hsl)
  secondaryColor?: string;     // Secondary brand color (hex/hsl)
  backgroundColor?: string;    // Custom menu container background color (hex/hsl)
  textColor?: string;          // Custom body text color (hex/hsl)
  fontFamily?: string;         // Custom font family (e.g. "Inter", "Outfit", "Roboto")
  hidePoweredBy?: boolean;     // Toggle to hide "Powered by The Scan Menu" attribution footer
  customCss?: string;          // Optional custom CSS override string (max 10,000 chars)
}
```

---

## API Endpoints

### 1. Retrieve White Label Configuration
*   **Endpoint**: `GET /api/v1/restaurants/:restaurantId/white-label`
*   **Authorization**: Authenticated Manager / Super Admin token (`requireAuth`, `requireRestaurantAccess`).
*   **Feature Flag**: `white_label` must be enabled.
*   **Response Envelope**:
    ```json
    {
      "success": true,
      "data": {
        "enabled": true,
        "customDomain": "menu.gourmetbistro.com",
        "primaryColor": "#111827",
        "hidePoweredBy": true
      },
      "message": "White label configuration retrieved successfully"
    }
    ```

### 2. Update White Label Configuration
*   **Endpoint**: `PATCH /api/v1/restaurants/:restaurantId/white-label`
*   **Authorization**: Authenticated Manager / Super Admin token (`requireAuth`, `requireRestaurantAccess`).
*   **Feature Flag**: `white_label` must be enabled.
*   **Validation Rules**: Zod schema validating color hex/hsl formats, valid URLs, unique customDomain constraint across tenants, max 10,000 chars custom CSS.
*   **Response Envelope**:
    ```json
    {
      "success": true,
      "data": {
        "enabled": true,
        "customDomain": "menu.gourmetbistro.com",
        "primaryColor": "#0055FF",
        "fontFamily": "Outfit",
        "hidePoweredBy": true
      },
      "message": "White label configuration updated successfully"
    }
    ```

### 3. Public Custom Domain Resolution
*   **Endpoint**: `GET /api/v1/public/white-label/domain/:domain`
*   **Authorization**: Public (unauthenticated).
*   **Query Mechanics**: Performs sparse-index `$eq` search on `whiteLabelConfig.customDomain` where `enabled == true`.
*   **Response Envelope**:
    ```json
    {
      "success": true,
      "data": {
        "restaurant": {
          "id": "66af123456789...",
          "name": "Gourmet Bistro",
          "slug": "gourmet-bistro",
          "currency": "INR"
        },
        "whiteLabel": {
          "enabled": true,
          "customDomain": "menu.gourmetbistro.com",
          "primaryColor": "#0055FF",
          "hidePoweredBy": true
        }
      },
      "message": "Custom domain tenant resolved successfully"
    }
    ```

---

## Security & Authorization Rules
1. **Feature Flag Enforcement**: Access to `/api/v1/restaurants/:id/white-label` is strictly guarded by `requireFeature('white_label')`.
2. **Domain Uniqueness**: The backend checks for duplicate custom domain registrations before updating settings, returning `HTTP 409 CUSTOM_DOMAIN_TAKEN` if another tenant uses the domain.
3. **Role Gating**: `STAFF` tokens are rejected with `HTTP 403 Forbidden`.
4. **Tenant Isolation**: Managers can only view and edit white label settings for their authorized restaurant.
