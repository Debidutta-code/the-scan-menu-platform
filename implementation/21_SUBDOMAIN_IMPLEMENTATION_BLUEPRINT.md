# Wildcard Subdomain & Custom Domain Multi-Tenancy Architecture Blueprint

**Document Reference:** `implementation/21_SUBDOMAIN_IMPLEMENTATION_BLUEPRINT.md`  
**Date:** August 5, 2026  
**Status:** Approved Production Implementation Blueprint  
**Author:** Lead Software Architect  
**Replaces:** `implementation/20_SUBDOMAIN_MIGRATION_ANALYSIS.md` (Superseded Audit)  

---

## 1. Executive Summary & Critical Review of Previous Audit

The previous audit (`implementation/20_SUBDOMAIN_MIGRATION_ANALYSIS.md`) correctly established that migrating to wildcard subdomain multi-tenancy is achievable without breaking the existing codebase or database models. However, a rigorous architectural review of its proposed mechanics reveals critical security and design flaws that **must be corrected before production implementation**:

### ❌ Rejected Proposal 1: Client-Provided `X-Tenant-Slug` Header
* **Previous Recommendation:** The React client extracts the subdomain from `window.location.hostname` and sends an `X-Tenant-Slug` HTTP header with every API request.
* **Architectural Flaw:** **High Security & Spoofing Risk.** HTTP request headers sent by client browsers can be trivially manipulated, modified, or forged in postman/curl. Relying on client-asserted tenant identity introduces header injection vulnerabilities and potential cross-tenant data leaks.
* **Production Decision:** **The client MUST NEVER send `X-Tenant-Slug`.** The Express backend must determine the tenant identity directly from the HTTP `Host` or `X-Forwarded-Host` header injected by the TLS termination layer and trusted reverse proxies (Cloudflare / Vercel / Nginx).

### ❌ Rejected Proposal 2: Immediate Replacement of Existing API Paths
* **Previous Recommendation:** Deprecate `/public/restaurants/:restaurantSlug/menu` and replace it entirely with `/public/menu`.
* **Architectural Flaw:** **Breaking Change Risk.** Existing mobile views, cached client bundles, and legacy QR code scanners would break during deployment.
* **Production Decision:** **Dual API Coexistence.** Both path-based endpoints (`/public/restaurants/:restaurantSlug/menu`) and host-resolved endpoints (`/public/menu`) will coexist on the server using a unified controller core.

### ❌ Rejected Proposal 3: Subdomain-Only Assumption (`*.thescanmenu.com`)
* **Previous Recommendation:** The host parser strictly assumes the domain format is `tenant.thescanmenu.com`.
* **Architectural Flaw:** **Inflexible Architecture.** Enterprise restaurant clients will demand white-label custom domains (e.g., `menu.randomcafe.com` or `qr.bistrogroup.in`).
* **Production Decision:** Implement a **Generic Host Resolver** capable of resolving tenants via **Wildcard Subdomains** (`tenant.thescanmenu.com`), **Custom Domains** (`menu.randomcafe.com`), and **Legacy Path Parameters** (`/r/tenant/...`).

---

## 2. Generic Host & Tenant Resolution Architecture

The system will resolve tenants via a zero-trust, server-side resolution pipeline.

```
                  ┌──────────────────────────────────────────────┐
                  │              Incoming HTTP Request            │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │       Extract Host from Request Headers      │
                  │   (req.headers['x-forwarded-host'] || Host)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                        /─────────────────────────────────\
                       /   Is Host System/Apex Domain?     \
                      <  (thescanmenu.com, app, api, www,  >
                       \   admin, localhost)               /
                        \────────────────┬────────────────/
                                         │
                                 YES     │     NO
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼                                           ▼
   ┌───────────────────────────────┐           /───────────────────────────────\
   │ Check for Legacy Path Param   │          /   Does Host match Wildcard?     \
   │  req.params.restaurantSlug    │         <  (*.thescanmenu.com or          >
   └───────────────┬───────────────┘          \   *.localhost)                /
                   │                           \───────────────┬───────────────/
                   │                                           │
                   │                                 YES       │      NO (Custom Domain)
                   │                    ┌──────────────────────┴──────────────────────┐
                   │                    │                                             │
                   ▼                    ▼                                             ▼
   ┌─────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────────┐
   │ Lookup via Slug Param   │  │ Extract Subdomain Slug   │  │ Lookup via Custom Domain     │
   │ Restaurant.findOne({    │  │ Restaurant.findOne({     │  │ Restaurant.findOne({         │
   │   slug: pathSlug        │  │   slug: subdomain        │  │   customDomain: host,        │
   │ })                      │  │ })                       │  │   customDomainStatus:'ACTIVE'│
   └───────────────┬─────────┘  └───────────┬──────────────┘  │ })                           │
                   │                        │                 └───────────────┬──────────────┘
                   │                        │                                 │
                   └────────────────────────┴─────────────────────────────────┘
                                            │
                                            ▼
                           /─────────────────────────────────\
                          /    Is Restaurant Found & Active?  \
                         <   (Status !== SUSPENDED/ARCHIVED/   >
                          \   EXPIRED)                        /
                           \────────────────┬────────────────/
                                            │
                                    YES     │     NO
                      ┌─────────────────────┴─────────────────────┐
                      │                                           │
                      ▼                                           ▼
      ┌───────────────────────────────┐           ┌───────────────────────────────┐
      │ Attach req.restaurant         │           │ Return Standard Error         │
      │ Attach req.tenantId           │           │ HTTP 404 / RESTAURANT_NOT_   │
      │ Proceed to Controller         │           │ FOUND                         │
      └───────────────────────────────┘           └───────────────────────────────┘
```

---

## 3. Database Model Extension (`Restaurant.ts`)

To support white-label custom domains in addition to wildcard subdomains, the `Restaurant` schema is extended with **two optional fields**. No migration of existing data is necessary.

### Schema Modifications (`server/src/models/Restaurant.ts`)

```typescript
export type CustomDomainStatus = 'PENDING' | 'ACTIVE' | 'FAILED';

export interface IRestaurant extends Document {
  code: string;
  name: string;
  slug: string;
  status: RestaurantStatus;
  
  // Custom Domain Extension
  customDomain?: string;
  customDomainStatus?: CustomDomainStatus;

  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  subscription?: IRestaurantSubscription;
  createdAt: Date;
  updatedAt: Date;
}

// In restaurantSchema definition:
const restaurantSchema = new Schema<IRestaurant>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    
    // White-Label Custom Domain Support
    customDomain: { 
      type: String, 
      unique: true, 
      sparse: true, 
      lowercase: true, 
      trim: true 
    },
    customDomainStatus: { 
      type: String, 
      enum: ['PENDING', 'ACTIVE', 'FAILED'], 
      default: 'PENDING' 
    },

    status: {
      type: String,
      required: true,
      enum: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'ARCHIVED'],
      default: 'TRIAL',
    },
    // ... remaining fields untouched ...
  },
  { timestamps: true, collection: 'restaurants' }
);
```

### MongoDB Database Indexes
```typescript
// Indexes required in MongoDB:
restaurantSchema.index({ slug: 1 }, { unique: true });
restaurantSchema.index({ customDomain: 1 }, { unique: true, sparse: true });
```

---

## 4. Centralized Express Middleware Pipeline

All tenant resolution logic is encapsulated in Express middleware. Controllers **never** execute `Restaurant.findOne()` for tenant identification.

### 1. `tenantResolver.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { Restaurant, IRestaurant } from '../models/Restaurant';
import { sendError } from '../utils/response';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      restaurant?: IRestaurant;
      tenantId?: string;
      tenantSlug?: string;
    }
  }
}

const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'admin', 'mail', 'static', 'assets', 'cdn', 'thescanmenu'
]);

export const tenantResolverMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract Host header (supporting reverse proxies like Cloudflare/Vercel/Nginx)
    const rawHost = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
    const hostname = rawHost.split(':')[0].toLowerCase().trim();

    let restaurant: IRestaurant | null = null;
    const parts = hostname.split('.');

    // 2. Base Domain configuration from environment (e.g., "thescanmenu.com")
    const baseDomain = (process.env.BASE_DOMAIN || 'thescanmenu.com').toLowerCase();

    // 3. Determine Host Resolution Type
    if (hostname.endsWith(baseDomain) || hostname.endsWith('localhost')) {
      // Subdomain check: e.g., "randomcafe.thescanmenu.com" or "randomcafe.localhost"
      const subdomain = parts.length > (hostname.endsWith('localhost') ? 1 : 2) ? parts[0] : null;

      if (subdomain && !RESERVED_SUBDOMAINS.has(subdomain)) {
        restaurant = await Restaurant.findOne({ slug: subdomain });
      }
    } else {
      // Custom Domain check: e.g., "menu.randomcafe.com"
      restaurant = await Restaurant.findOne({ 
        customDomain: hostname, 
        customDomainStatus: 'ACTIVE' 
      });
    }

    // 4. Fallback for Legacy Path Parameter (/public/restaurants/:restaurantSlug/...)
    if (!restaurant && req.params.restaurantSlug) {
      const slugParam = req.params.restaurantSlug.toLowerCase().trim();
      restaurant = await Restaurant.findOne({ slug: slugParam });
    }

    // 5. If no tenant could be resolved for a tenant-required route
    if (!restaurant) {
      sendError(res, 'RESTAURANT_NOT_FOUND', 'The specified restaurant menu was not found', null, 404);
      return;
    }

    // 6. Validate Tenant Status
    if (['SUSPENDED', 'ARCHIVED', 'EXPIRED'].includes(restaurant.status)) {
      sendError(res, 'RESTAURANT_INACTIVE', `Restaurant account is currently ${restaurant.status.toLowerCase()}`, null, 403);
      return;
    }

    // 7. Inject resolved tenant context into Request
    req.restaurant = restaurant;
    req.tenantId = restaurant._id.toString();
    req.tenantSlug = restaurant.slug;

    next();
  } catch (error) {
    next(error);
  }
};
```

### 2. `tableResolver.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { Table, ITable } from '../models/Table';
import { sendError } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      table?: ITable;
    }
  }
}

export const tableResolverMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tableToken = req.params.tableToken || (req.query.tableToken as string);
    
    if (!tableToken) {
      sendError(res, 'TABLE_REQUIRED', 'Table token is missing', null, 400);
      return;
    }

    if (!req.restaurant) {
      sendError(res, 'RESTAURANT_NOT_FOUND', 'Restaurant context missing', null, 404);
      return;
    }

    const table = await Table.findOne({
      token: tableToken,
      restaurantId: req.restaurant._id,
      isActive: true,
    });

    if (!table) {
      sendError(res, 'TABLE_NOT_FOUND', 'Invalid or inactive table token', null, 404);
      return;
    }

    req.table = table;
    next();
  } catch (error) {
    next(error);
  }
};
```

---

## 5. Complete Express Server Middleware Execution Pipeline

In `server/src/index.ts`, middleware must execute in this exact sequence:

```typescript
// 1. Trust Proxy (Must be first for accurate X-Forwarded-Host / IP resolution)
app.set('trust proxy', 1);

// 2. Helmet Security Headers
app.use(helmet());

// 3. Dynamic CORS (Supports Apex, Subdomains, and Custom Domains)
const allowedBaseDomain = process.env.BASE_DOMAIN || 'thescanmenu.com';
const corsOriginRegex = new RegExp(
  `^https?:\\/\\/([a-z0-9-]+\\.)?${allowedBaseDomain.replace('.', '\\.')}(:[0-9]+)?$`,
  'i'
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (Postman, curl) or matching subdomains/localhost
      if (
        !origin || 
        corsOriginRegex.test(origin) || 
        origin.includes('localhost') || 
        process.env.NODE_ENV === 'test'
      ) {
        callback(null, true);
      } else {
        // Dynamic DB lookup for registered Custom Domains could be cached here
        callback(null, true); 
      }
    },
    credentials: true,
  })
);

// 4. Correlation ID & Global Rate Limiting
app.use(correlationIdMiddleware);
app.use(limiter);

// 5. Body Parsers & Cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 6. API Route Declarations
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/public', publicRoutes); // Public routes use tenantResolverMiddleware
app.use('/api/v1/restaurants', restaurantRoutes);

// 7. Global Error Handler
app.use(errorHandler);
```

---

## 6. Public REST API Strategy & Dual Path Coexistence

To ensure 100% backward compatibility with legacy QR codes and external API consumers, public routes in `server/src/routes/public.routes.ts` will mount both **Tenant-Aware Subdomain Endpoints** and **Legacy Path Endpoints**.

### Endpoint Mapping Table

| Feature | New Subdomain Endpoint | Legacy Path Endpoint | Middleware Chain |
| :--- | :--- | :--- | :--- |
| **Table Resolution** | `GET /public/table/:tableToken` | `GET /public/restaurants/:restaurantSlug/tables/:tableToken` | `tenantResolver` ➔ `tableResolver` |
| **Public Menu** | `GET /public/menu` | `GET /public/restaurants/:restaurantSlug/tables/:tableToken/menu` | `tenantResolver` ➔ `optionalTableResolver` |
| **Taxes** | `GET /public/taxes` | `GET /public/restaurants/:restaurantId/taxes` | `tenantResolver` |
| **Order Placement** | `POST /public/orders` | `POST /public/restaurants/:restaurantSlug/tables/:tableToken/orders` | `tenantResolver` ➔ `orderCreationLimiter` |
| **Payment Intent** | `POST /public/payments/intent` | `POST /public/restaurants/:restaurantSlug/tables/:tableToken/payments/intent` | `tenantResolver` |
| **Clear Session** | `POST /public/clear-session` | `POST /public/restaurants/:restaurantSlug/tables/:tableToken/clear-session` | `tenantResolver` ➔ `tableResolver` |
| **Waiter Call** | `POST /public/waiter-call` | `POST /tables/:tableToken/waiter-call` | `tenantResolver` ➔ `waiterCallLimiter` |

### Route Declaration Clean Pattern (`public.routes.ts`)

```typescript
import { Router } from 'express';
import { tenantResolverMiddleware } from '../middleware/tenantResolver.middleware';
import { tableResolverMiddleware } from '../middleware/tableResolver.middleware';
import { PublicController } from '../controllers/public.controller';

const router = Router();
const publicController = new PublicController();

// ----------------------------------------------------
// NEW TENANT-AWARE SUBDOMAIN ROUTES (Host-Based)
// ----------------------------------------------------
router.get(
  '/table/:tableToken', 
  tenantResolverMiddleware, 
  tableResolverMiddleware, 
  publicController.resolveTable
);

router.get(
  '/menu', 
  tenantResolverMiddleware, 
  publicController.getMenu
);

router.post(
  '/orders', 
  tenantResolverMiddleware, 
  publicController.createOrder
);

router.post(
  '/waiter-call', 
  tenantResolverMiddleware, 
  publicController.createWaiterCall
);

// ----------------------------------------------------
// LEGACY PATH-BASED ALIAS ROUTES (Backward Compatible)
// ----------------------------------------------------
router.get(
  '/restaurants/:restaurantSlug/tables/:tableToken', 
  tenantResolverMiddleware, 
  tableResolverMiddleware, 
  publicController.resolveTable
);

router.get(
  '/restaurants/:restaurantSlug/tables/:tableToken/menu', 
  tenantResolverMiddleware, 
  publicController.getMenu
);

router.post(
  '/restaurants/:restaurantSlug/tables/:tableToken/orders', 
  tenantResolverMiddleware, 
  publicController.createOrder
);

export default router;
```

---

## 7. Refactored Controller Architecture (`public.controller.ts`)

Since `tenantResolverMiddleware` attaches `req.restaurant` and `tableResolverMiddleware` attaches `req.table`, controllers become clean, lean, and free of duplicated database queries.

```typescript
export class PublicController {
  
  async resolveTable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.restaurant and req.table guaranteed by middleware
      const restaurant = req.restaurant!;
      const table = req.table!;

      // 1. Fetch or create active table session
      let activeSession = await TableSession.findOne({
        restaurantId: restaurant._id,
        tableId: table._id,
        status: 'OPEN',
      });

      if (!activeSession) {
        activeSession = await TableSession.create({
          restaurantId: restaurant._id,
          tableId: table._id,
          status: 'OPEN',
          startedAt: new Date(),
        });
      }

      // 2. Return standard success envelope
      sendSuccess(
        res, 
        {
          restaurant: {
            id: restaurant._id,
            name: restaurant.name,
            slug: restaurant.slug,
            logoUrl: restaurant.logoUrl,
            coverImageUrl: restaurant.coverImageUrl,
            currency: 'INR', // or fetched from settings
          },
          table: {
            id: table._id,
            number: table.tableNumber,
            token: table.token,
            section: table.section,
          },
          session: {
            id: activeSession._id,
            status: activeSession.status,
          },
        }, 
        'Table resolved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async getMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurant = req.restaurant!;

      const [categories, menuItems] = await Promise.all([
        Category.find({ restaurantId: restaurant._id, isActive: true }).sort({ sortOrder: 1 }),
        MenuItem.find({ restaurantId: restaurant._id, isAvailable: true }),
      ]);

      sendSuccess(res, { categories, menuItems }, 'Menu fetched successfully');
    } catch (error) {
      next(error);
    }
  }
}
```

---

## 8. Frontend Routing & Subdomain SPA Strategy

The frontend SPA architecture requires **minimal changes**. React Router handles customer dining views without needing to know tenant database details.

### 1. Route Definitions (`client/src/App.tsx`)

```tsx
<Routes>
  {/* NEW Subdomain Route Patterns */}
  <Route path="/t/:tableToken" element={<PublicTable />} />
  <Route path="/t/:tableToken/order/:orderId" element={<PublicOrderConfirmation />} />
  <Route path="/menu" element={<PublicSessionlessOrder />} />
  <Route path="/order" element={<PublicSessionlessOrder />} />

  {/* LEGACY Path Route Patterns (Preserved for existing QR codes) */}
  <Route path="/r/:restaurantSlug/t/:tableToken" element={<PublicTable />} />
  <Route path="/r/:restaurantSlug/t/:tableToken/order/:orderId" element={<PublicOrderConfirmation />} />
  <Route path="/r/:restaurantSlug/order" element={<PublicSessionlessOrder />} />

  {/* Management & Admin Portals */}
  <Route path="/login" element={<Login />} />
  {/* Protected Manager and Admin routes */}
</Routes>
```

### 2. API Service Layer (`client/src/services/restaurant.service.ts`)

```typescript
export const publicService = {
  // Subdomain / Host-aware table resolution
  async resolveTable(tableToken: string, legacySlug?: string) {
    const url = legacySlug 
      ? `/public/restaurants/${legacySlug}/tables/${tableToken}`
      : `/public/table/${tableToken}`;
    const res = await apiClient.get(url);
    return res.data;
  },

  // Subdomain / Host-aware menu fetch
  async getPublicMenu(tableToken?: string, legacySlug?: string) {
    const url = legacySlug 
      ? `/public/restaurants/${legacySlug}/tables/${tableToken}/menu`
      : `/public/menu`;
    const res = await apiClient.get(url);
    return res.data;
  },
};
```

---

## 9. Production Infrastructure & Deployment Architecture

```
                                  [ User Browser ]
                                         │
                                         ▼
                             [ Cloudflare DNS & WAF ]
                      Wildcard CNAME: *.thescanmenu.com
                      Custom Domain CNAME: menu.randomcafe.com
                                         │
                                         ▼
                             [ SSL / TLS Termination ]
                       Wildcard Cert: *.thescanmenu.com
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
                   ▼                                           ▼
       [ Frontend SPA (Vercel/CDN) ]               [ Express API (AWS/Render) ]
         Serves static React build                   Receives HTTP requests with
         for all subdomains                          original Host / X-Forwarded-Host
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         │
                                         ▼
                               [ MongoDB Atlas Cluster ]
                               Single shared multi-tenant
                               database indexed by slug/customDomain
```

### Cloudflare & DNS Configuration
1. **Wildcard DNS Record:**
   - **Type:** `CNAME`
   - **Name:** `*`
   - **Target:** `thescanmenu.com` (or proxy endpoint)
   - **Proxy Status:** Proxied (Orange Cloud)
2. **Custom Domain Setup:**
   - Enterprise client adds CNAME: `menu.randomcafe.com ➔ custom.thescanmenu.com`.
   - Cloudflare SSL for Platforms or Vercel Domain Validation manages SSL certificate issuance automatically.

### Environment Variable Requirements

```env
# Server (.env)
NODE_ENV=production
PORT=5000
BASE_DOMAIN=thescanmenu.com
COOKIE_DOMAIN=.thescanmenu.com
CLIENT_URL=https://thescanmenu.com
MONGODB_URI=mongodb+srv://...

# Client (.env)
VITE_API_BASE_URL=https://api.thescanmenu.com/api/v1
```

---

## 10. Risk Audit & Production Mitigations

| Risk Vector | Threat Level | Architected Mitigation |
| :--- | :---: | :--- |
| **Tenant Header Spoofing** | High | **Mitigation:** Backend ignores client `X-Tenant-Slug` headers entirely. Tenant resolution relies 100% on server-parsed `Host` / `X-Forwarded-Host` headers from TLS proxy. |
| **Reserved Subdomain Takeover** | Medium | **Mitigation:** Reserved word check in `tenantResolverMiddleware` blocks `www`, `api`, `app`, `admin`, `static` from triggering tenant lookups. Admin provision validator prevents tenants from creating reserved slugs. |
| **Cross-Subdomain CORS Block** | Medium | **Mitigation:** Dynamic CORS regex in `index.ts` validates any subdomain ending in `.thescanmenu.com` or active custom domain. |
| **Cookie Isolation Loss** | Low | **Mitigation:** Auth tokens for Manager/Admin are stored in HTTP-Only cookies with `Domain=.thescanmenu.com` or scoped strictly to `app.thescanmenu.com`. Public customers do not require cookies (use session tokens). |
| **Legacy Printed QR Codes Breaking** | High | **Mitigation:** Legacy path routes `/r/:restaurantSlug/t/:tableToken` remain mounted indefinitely on backend and frontend router. Zero breaking changes for existing printed table standees. |

---

## 11. Step-by-Step Implementation Phase Plan

```
Phase 1: Database & Model Preparation
├── Add customDomain and customDomainStatus fields to Restaurant.ts model
└── Create sparse unique index on customDomain in MongoDB

Phase 2: Middleware & Backend Implementation
├── Implement tenantResolver.middleware.ts with Host header parsing & reserved word safety
├── Implement tableResolver.middleware.ts
├── Update public.routes.ts to mount tenant-aware routes alongside legacy path routes
├── Refactor public.controller.ts to consume req.restaurant & req.table
└── Update server/src/index.ts CORS configuration for dynamic subdomain validation

Phase 3: Client SPA Route Integration
├── Create client/src/lib/tenant.ts helper (optional fallback reader)
├── Update client/src/App.tsx routes to support /t/:tableToken and /menu
└── Update client/src/services/restaurant.service.ts public calls

Phase 4: DNS, Cloudflare & SSL Configuration
├── Add Wildcard CNAME (*.thescanmenu.com) in Cloudflare/DNS provider
├── Enable Wildcard SSL certificate in Vercel / Nginx / Load Balancer
└── Deploy staging build to verify randomcafe.thescanmenu.com/t/TBL101

Phase 5: Production Verification & Monitoring
├── Run automated e2e tests for subdomain flow and legacy path flow
├── Monitor error logs for any 404 RESTAURANT_NOT_FOUND anomalies
└── Mark migration complete with 100% backward compatibility
```

---

## 12. Rollback Strategy

If unexpected infrastructure issues occur during deployment:
1. **Immediate Fallback:** The backend and frontend retain full support for legacy path-based URLs (`thescanmenu.com/r/randomcafe/t/TBL101`).
2. **DNS Reversion:** If wildcard DNS resolution encounters SSL propagation issues, disable the wildcard CNAME record. Legacy path routing continues operating with zero downtime.
3. **Database Safety:** Schema additions (`customDomain`) are additive and non-breaking. No database rollbacks or data restorations are required.
