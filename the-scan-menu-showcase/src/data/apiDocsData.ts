export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface ApiResponseSample {
  status: number;
  description: string;
  body: Record<string, any>;
}

export interface ApiEndpoint {
  id: string;
  title: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'WS';
  path: string;
  category: string;
  description: string;
  auth: 'Public' | 'Staff' | 'Manager' | 'Super Admin' | 'API Key';
  featureFlag?: string;
  rateLimit?: string;
  headers?: ApiParameter[];
  pathParams?: ApiParameter[];
  queryParams?: ApiParameter[];
  requestBody?: {
    description?: string;
    schema: Record<string, any>;
    sample: Record<string, any>;
  };
  responses: ApiResponseSample[];
  tags: string[];
}

export interface SocketEventDoc {
  name: string;
  direction: 'Client to Server' | 'Server to Client';
  room?: string;
  description: string;
  payload: Record<string, any>;
}

export interface ApiCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  badge?: string;
}

export const API_CATEGORIES: ApiCategory[] = [
  {
    id: 'auth',
    name: 'Authentication & Identity',
    description: 'JWT token lifecycle, session cookies, staff login, and account profiles.',
    iconName: 'Key',
  },
  {
    id: 'public-guest',
    name: 'Public Guest & Table Dining',
    description: 'Subdomain and token-driven guest ordering, live menu viewing, bill settlements, and floor assistance.',
    iconName: 'QrCode',
    badge: 'Guest Facing',
  },
  {
    id: 'menu',
    name: 'Menu & Category Management',
    description: 'Categories, menu items, modifier groups, dietary tags, stock counters, and real-time 86ing toggles.',
    iconName: 'UtensilsCrossed',
  },
  {
    id: 'orders',
    name: 'Floor Orders & Sessions',
    description: 'Order lifecycle states, multi-round table sessions, kitchen dispatch, counter checkout, and ticket cancellations.',
    iconName: 'Receipt',
  },
  {
    id: 'kds',
    name: 'Kitchen Display System (KDS)',
    description: 'Live chef workstation tickets, ticket bumping, item prep status transitions, and history recall.',
    iconName: 'Flame',
    badge: 'Kitchen Station',
  },
  {
    id: 'restaurant-profile',
    name: 'Restaurant Operations & Config',
    description: 'Brand identity, currency, business hours, and per-tenant dynamic feature flags.',
    iconName: 'Building2',
  },
  {
    id: 'tables-qr',
    name: 'Tables & Dynamic QR Codes',
    description: 'Table provision, capacity, floor zones, bulk generator, and high-resolution print QR SVG/PNG rendering.',
    iconName: 'ScanLine',
  },
  {
    id: 'zones',
    name: 'Floor Zones & Seating Layout',
    description: 'Dining areas, patios, rooftop sections, VIP rooms, and capacity management.',
    iconName: 'LayoutGrid',
  },
  {
    id: 'taxes',
    name: 'Taxes & Surcharges',
    description: 'Inclusive/exclusive GST, VAT, service charges, and automated bill calculations.',
    iconName: 'Percent',
  },
  {
    id: 'staff',
    name: 'Staff & Floor Team',
    description: 'Waitstaff and manager provisioning, secure PIN logins, and restaurant scoping.',
    iconName: 'Users',
  },
  {
    id: 'waiter-calls',
    name: 'Floor Assistance (Waiter Calls)',
    description: 'Table assistance bells, water requests, bill requests, and staff resolution workflow.',
    iconName: 'BellRing',
  },
  {
    id: 'payments',
    name: 'Payments & Revenue',
    description: 'Razorpay / Stripe intent creation, transaction ledger, payout configs, and CSV accounting exports.',
    iconName: 'CreditCard',
  },
  {
    id: 'pos-integration',
    name: 'POS Integration (Petpooja Hub)',
    description: 'Bidirectional sync with legacy POS systems, automated menu push, and order relaying.',
    iconName: 'Cpu',
  },
  {
    id: 'analytics',
    name: 'Analytics & Performance BI',
    description: 'Revenue trends, top-selling items, average ticket times, peak hour heatmaps, and floor throughput.',
    iconName: 'BarChart3',
  },
  {
    id: 'developer',
    name: 'Developer Hub & Webhooks',
    description: 'Scoped API key generation, outbound webhook triggers, HMAC signature verification, and ping tests.',
    iconName: 'Code2',
  },
  {
    id: 'openapi',
    name: 'OpenAPI v1 External Gateway',
    description: 'Public API gateway for 3rd-party ERPs, delivery aggregators, and custom kiosk software.',
    iconName: 'Globe',
    badge: 'v1 Gateway',
  },
  {
    id: 'subscription',
    name: 'Subscription & Multi-Tenancy',
    description: 'SaaS tier definitions (Basic, Pro, Enterprise), restaurant license assignment, and quota checks.',
    iconName: 'Sparkles',
  },
  {
    id: 'admin',
    name: 'Super Admin Platform Hub',
    description: 'Multi-tenant provisioning, restaurant suspension, global audit logs, POS routing, and platform analytics.',
    iconName: 'ShieldAlert',
    badge: 'Super Admin',
  },
  {
    id: 'inbound-webhooks',
    name: 'Inbound Gateway Webhooks',
    description: 'Payment gateway callbacks (Razorpay) and POS synchronization callbacks (Petpooja).',
    iconName: 'Webhook',
  },
  {
    id: 'health',
    name: 'Health Probes & Telemetry',
    description: 'Kubernetes liveness, readiness probes, MongoDB heartbeat, and service uptime diagnostics.',
    iconName: 'Activity',
  },
  {
    id: 'websockets',
    name: 'Real-Time WebSockets (Socket.IO)',
    description: 'Sub-second event bus for instant floor alerts, kitchen notifications, and live bill sync.',
    iconName: 'Radio',
    badge: 'Real-Time',
  },
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  // 1. AUTHENTICATION
  {
    id: 'auth-login',
    title: 'Authenticate User / Staff Login',
    method: 'POST',
    path: '/api/v1/auth/login',
    category: 'auth',
    description: 'Authenticates a restaurant manager, staff member, or super admin using email and password. On success, returns an access token in the response body and sets an HTTP-only secure Refresh Token cookie.',
    auth: 'Public',
    rateLimit: '5 requests / min (authRateLimiter)',
    requestBody: {
      schema: {
        email: 'string (valid email format, required)',
        password: 'string (min 6 characters, required)',
      },
      sample: {
        email: 'manager@bistroluxe.com',
        password: 'Password@123',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Authentication successful',
        body: {
          success: true,
          data: {
            user: {
              id: '65cb01f893e1a02b1f812345',
              name: 'John Doe',
              email: 'manager@bistroluxe.com',
              role: 'MANAGER',
              restaurants: ['65cb01f893e1a02b1f812999'],
            },
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          message: 'Login successful',
        },
      },
      {
        status: 401,
        description: 'Invalid credentials or account inactive',
        body: {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            details: null,
          },
        },
      },
    ],
    tags: ['Auth', 'JWT', 'Login', 'Session'],
  },
  {
    id: 'auth-refresh',
    title: 'Refresh Access Token',
    method: 'POST',
    path: '/api/v1/auth/refresh',
    category: 'auth',
    description: 'Rotates and issues a brand-new short-lived JWT Access Token using the secure HTTP-only refreshToken cookie or optional request body payload.',
    auth: 'Public',
    requestBody: {
      description: 'Optional if refreshToken cookie is present in request headers',
      schema: {
        refreshToken: 'string (optional fallback if cookie disabled)',
      },
      sample: {
        refreshToken: 'dGhpc2lzYXJlZnJlc2h0b2tlbg...',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Token refreshed successfully',
        body: {
          success: true,
          data: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.newPayload...',
          },
        },
      },
      {
        status: 401,
        description: 'Refresh token expired or revoked',
        body: {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Refresh token has expired or is invalid. Please log in again.',
          },
        },
      },
    ],
    tags: ['Auth', 'JWT', 'Token Rotation'],
  },
  {
    id: 'auth-logout',
    title: 'Terminate Session & Logout',
    method: 'POST',
    path: '/api/v1/auth/logout',
    category: 'auth',
    description: 'Invalidates the refresh token server-side and clears the HTTP-only cookie from the client.',
    auth: 'Public',
    responses: [
      {
        status: 200,
        description: 'Logged out successfully',
        body: {
          success: true,
          message: 'Logged out successfully',
        },
      },
    ],
    tags: ['Auth', 'Logout'],
  },
  {
    id: 'auth-me',
    title: 'Get Current Authenticated Profile',
    method: 'GET',
    path: '/api/v1/auth/me',
    category: 'auth',
    description: 'Returns profile details for the currently authenticated user along with their active restaurant staff memberships and roles.',
    auth: 'Staff',
    headers: [
      {
        name: 'Authorization',
        type: 'string',
        required: true,
        description: 'Bearer <accessToken>',
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Current user profile returned',
        body: {
          success: true,
          data: {
            user: {
              id: '65cb01f893e1a02b1f812345',
              name: 'Sarah Connor',
              email: 'sarah@bistroluxe.com',
              role: 'MANAGER',
              phone: '+15550192834',
            },
            staffRestaurants: [
              {
                restaurantId: '65cb01f893e1a02b1f812999',
                name: 'Bistro Luxe Downtown',
                role: 'MANAGER',
                isActive: true,
              },
            ],
          },
        },
      },
    ],
    tags: ['Auth', 'Profile', 'Me'],
  },
  {
    id: 'auth-profile',
    title: 'Update Profile Details',
    method: 'PATCH',
    path: '/api/v1/auth/profile',
    category: 'auth',
    description: 'Allows authenticated users to update their display name or phone number.',
    auth: 'Staff',
    headers: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer <accessToken>' },
    ],
    requestBody: {
      schema: {
        name: 'string (optional)',
        phone: 'string (optional)',
      },
      sample: {
        name: 'Sarah Connor-Reese',
        phone: '+15559876543',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Profile updated',
        body: {
          success: true,
          data: {
            user: {
              id: '65cb01f893e1a02b1f812345',
              name: 'Sarah Connor-Reese',
              phone: '+15559876543',
            },
          },
        },
      },
    ],
    tags: ['Auth', 'Profile'],
  },
  {
    id: 'auth-change-password',
    title: 'Change Account Password',
    method: 'POST',
    path: '/api/v1/auth/change-password',
    category: 'auth',
    description: 'Enables authenticated users to safely rotate their login password by validating the existing hash first.',
    auth: 'Staff',
    headers: [
      { name: 'Authorization', type: 'string', required: true, description: 'Bearer <accessToken>' },
    ],
    requestBody: {
      schema: {
        currentPassword: 'string (required)',
        newPassword: 'string (min 8 chars, required)',
      },
      sample: {
        currentPassword: 'OldPassword@123',
        newPassword: 'SuperSecureNewPassword#456',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Password changed successfully',
        body: {
          success: true,
          message: 'Password updated successfully',
        },
      },
    ],
    tags: ['Auth', 'Security'],
  },

  // 2. PUBLIC GUEST & DINING
  {
    id: 'public-resolve-table',
    title: 'Resolve Table & Session (Subdomain / Token)',
    method: 'GET',
    path: '/api/v1/public/table/:tableToken',
    category: 'public-guest',
    description: 'Called when a guest scans an NFC tag or QR code. Validates table existence and resolves active dining session, floor zone, restaurant branding, and currency settings.',
    auth: 'Public',
    rateLimit: '60 requests / min',
    pathParams: [
      {
        name: 'tableToken',
        type: 'string',
        required: true,
        description: 'Unique secure UUID/alphanumeric token assigned to the physical table.',
      },
    ],
    responses: [
      {
        status: 200,
        description: 'Table verified and session active',
        body: {
          success: true,
          data: {
            table: {
              id: '65cb024b93e1a02b1f813001',
              tableNumber: '14',
              token: 'tbl_a89f92d40',
              capacity: 4,
              isActive: true,
              zone: { id: '65cb024b93e1a02b1f813002', name: 'Terrace Garden' },
            },
            restaurant: {
              id: '65cb01f893e1a02b1f812999',
              name: 'Bistro Luxe',
              slug: 'bistro-luxe',
              currency: 'USD',
              currencySymbol: '$',
              logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
              coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
              features: {
                qr_menu: true,
                ordering: true,
                payments: true,
                waiter_call: true,
              },
            },
            session: {
              id: '65cb027a93e1a02b1f813500',
              status: 'ACTIVE',
              roundCount: 2,
              totalAmount: 48.5,
              totalPaid: 0,
            },
          },
        },
      },
      {
        status: 404,
        description: 'Table token invalid or deactivated',
        body: {
          success: false,
          error: {
            code: 'TABLE_NOT_FOUND',
            message: 'The scanned table code is invalid or deactivated.',
          },
        },
      },
    ],
    tags: ['Public', 'NFC', 'QR', 'Table'],
  },
  {
    id: 'public-get-menu',
    title: 'Fetch Digital Menu Catalog (Table Context)',
    method: 'GET',
    path: '/api/v1/public/table/:tableToken/menu',
    category: 'public-guest',
    description: 'Retrieves all active categories, subcategories, menu items, dietary tags (Veg, Vegan, GF), allergens, modifier options, and real-time 86 stock availability flags for the dining table.',
    auth: 'Public',
    rateLimit: '60 requests / min',
    pathParams: [
      { name: 'tableToken', type: 'string', required: true, description: 'Table security token' },
    ],
    responses: [
      {
        status: 200,
        description: 'Structured menu catalog returned',
        body: {
          success: true,
          data: {
            categories: [
              {
                id: '65cb031193e1a02b1f814001',
                name: 'Wood-Fired Artisanal Pizzas',
                description: 'Slow-fermented sourdough crusts baked at 450°C',
                items: [
                  {
                    id: '65cb035593e1a02b1f814101',
                    name: 'Truffle & Wild Funghi',
                    description: 'Fior di latte, roasted wild mushrooms, white truffle oil, shaved pecorino',
                    price: 24.0,
                    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
                    isVeg: true,
                    isSpicy: false,
                    preparationTime: 12,
                    isAvailable: true,
                    stockCount: 18,
                    modifierGroups: [
                      {
                        name: 'Crust Preference',
                        minSelection: 1,
                        maxSelection: 1,
                        options: [
                          { name: 'Traditional Neapolitan', price: 0 },
                          { name: 'Gluten-Free Cauliflower (+ $3.50)', price: 3.5 },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ],
    tags: ['Public', 'Menu', 'Catalog'],
  },
  {
    id: 'public-place-order',
    title: 'Place Contactless Table Order (Round Submission)',
    method: 'POST',
    path: '/api/v1/public/table/:tableToken/orders',
    category: 'public-guest',
    description: 'Submits a guest order from the digital menu. Appends items to the active table session, calculates subtotal/taxes, and emits real-time Socket.IO alerts to kitchen KDS screens and manager terminals.',
    auth: 'Public',
    rateLimit: '5 orders / 10 min',
    pathParams: [
      { name: 'tableToken', type: 'string', required: true, description: 'Table security token' },
    ],
    requestBody: {
      schema: {
        items: [
          {
            menuItemId: 'string (MongoDB ObjectId, required)',
            quantity: 'number (min 1, required)',
            selectedModifiers: 'array of { groupName: string, optionName: string, price: number }',
            specialInstructions: 'string (optional, e.g. Extra Crispy)',
          },
        ],
        guestName: 'string (optional)',
        notes: 'string (optional allergy/table note)',
      },
      sample: {
        items: [
          {
            menuItemId: '65cb035593e1a02b1f814101',
            quantity: 2,
            selectedModifiers: [
              { groupName: 'Crust Preference', optionName: 'Traditional Neapolitan', price: 0 },
            ],
            specialInstructions: 'Well done crust please',
          },
        ],
        guestName: 'Alex Mercer',
        notes: 'Please bring water right away',
      },
    },
    responses: [
      {
        status: 201,
        description: 'Order created and dispatched to KDS',
        body: {
          success: true,
          data: {
            order: {
              id: '65cb040093e1a02b1f815001',
              orderNumber: '#1042',
              status: 'PLACED',
              roundNumber: 2,
              subtotal: 48.0,
              taxAmount: 4.8,
              totalAmount: 52.8,
              itemsCount: 2,
              createdAt: '2026-08-10T17:30:00Z',
            },
            sessionId: '65cb027a93e1a02b1f813500',
          },
          message: 'Order placed successfully and sent to the kitchen!',
        },
      },
    ],
    tags: ['Public', 'Order', 'Kitchen Dispatch'],
  },
  {
    id: 'public-waiter-call',
    title: 'Ring Floor Assistance / Waiter Bell',
    method: 'POST',
    path: '/api/v1/public/tables/:tableToken/waiter-call',
    category: 'public-guest',
    description: 'Triggers a quick floor assistance alert (Water Refill, Cutlery, Bill Request, or Assistance) to staff smartwatches and manager tablets.',
    auth: 'Public',
    rateLimit: '5 calls / 5 min',
    pathParams: [
      { name: 'tableToken', type: 'string', required: true, description: 'Table security token' },
    ],
    requestBody: {
      schema: {
        type: 'string (enum: "WATER" | "BILL" | "ASSISTANCE" | "CUSTOM", required)',
        notes: 'string (optional note from guest)',
      },
      sample: {
        type: 'WATER',
        notes: 'Sparkling water with lime',
      },
    },
    responses: [
      {
        status: 201,
        description: 'Waiter call registered and staff alerted',
        body: {
          success: true,
          data: {
            callId: '65cb04ee93e1a02b1f815888',
            tableNumber: '14',
            type: 'WATER',
            status: 'PENDING',
            createdAt: '2026-08-10T17:31:00Z',
          },
          message: 'Your request has been sent to our floor team.',
        },
      },
    ],
    tags: ['Public', 'Floor Assistance', 'Service Bell'],
  },
  {
    id: 'public-payment-intent',
    title: 'Create Guest Checkout Payment Intent',
    method: 'POST',
    path: '/api/v1/public/table/:tableToken/payments/intent',
    category: 'public-guest',
    description: 'Initializes an online payment session with Razorpay / Stripe for the entire table session or remaining bill balance.',
    auth: 'Public',
    pathParams: [
      { name: 'tableToken', type: 'string', required: true, description: 'Table security token' },
    ],
    requestBody: {
      schema: {
        orderId: 'string (optional, if paying for a single round)',
        tipAmount: 'number (optional gratuity in base currency)',
      },
      sample: {
        tipAmount: 8.0,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Payment gateway intent initialized',
        body: {
          success: true,
          data: {
            gateway: 'RAZORPAY',
            orderId: 'order_Nx8Y3k0qZ9Lm',
            amount: 60.8,
            currency: 'USD',
            keyId: 'rzp_live_abc123...',
          },
        },
      },
    ],
    tags: ['Public', 'Payment', 'Razorpay', 'Stripe'],
  },
  {
    id: 'public-clear-session',
    title: 'Clear / Release Table Session',
    method: 'POST',
    path: '/api/v1/public/table/:tableToken/clear-session',
    category: 'public-guest',
    description: 'Ends the guest dining session on table checkout and resets the table state for incoming patrons.',
    auth: 'Public',
    pathParams: [
      { name: 'tableToken', type: 'string', required: true, description: 'Table security token' },
    ],
    responses: [
      {
        status: 200,
        description: 'Table session closed',
        body: {
          success: true,
          message: 'Session closed successfully. Thank you for dining with us!',
        },
      },
    ],
    tags: ['Public', 'Session', 'Checkout'],
  },

  // 3. MENU MANAGEMENT
  {
    id: 'menu-list-categories',
    title: 'List Menu Categories',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/categories',
    category: 'menu',
    description: 'Returns all categories configured for the specified restaurant, sorted by display rank.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Categories listed',
        body: {
          success: true,
          data: [
            {
              id: '65cb031193e1a02b1f814001',
              name: 'Appetizers & Tapas',
              description: 'Small sharing plates for the table',
              sortOrder: 0,
              isActive: true,
              itemCount: 8,
            },
          ],
        },
      },
    ],
    tags: ['Menu', 'Categories'],
  },
  {
    id: 'menu-create-category',
    title: 'Create Menu Category',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/categories',
    category: 'menu',
    description: 'Adds a new section to the restaurant digital menu.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        name: 'string (min 2 chars, required)',
        description: 'string (optional)',
        sortOrder: 'number (optional, default 0)',
        isActive: 'boolean (optional, default true)',
      },
      sample: {
        name: 'Craft Cocktails & Wine',
        description: 'House-infused botanicals and biodynamic wines',
        sortOrder: 3,
        isActive: true,
      },
    },
    responses: [
      {
        status: 201,
        description: 'Category created',
        body: {
          success: true,
          data: {
            id: '65cb059993e1a02b1f816001',
            name: 'Craft Cocktails & Wine',
            sortOrder: 3,
            isActive: true,
          },
        },
      },
    ],
    tags: ['Menu', 'Category', 'Create'],
  },
  {
    id: 'menu-reorder-categories',
    title: 'Batch Reorder Categories',
    method: 'PATCH',
    path: '/api/v1/restaurants/:restaurantId/categories-reorder',
    category: 'menu',
    description: 'Updates the visual sorting order of all menu categories in a single atomic payload.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        orderedIds: 'array of string (MongoDB ObjectIds in desired sequence, required)',
      },
      sample: {
        orderedIds: [
          '65cb059993e1a02b1f816001',
          '65cb031193e1a02b1f814001',
        ],
      },
    },
    responses: [
      {
        status: 200,
        description: 'Categories reordered',
        body: {
          success: true,
          message: 'Categories sequence updated successfully',
        },
      },
    ],
    tags: ['Menu', 'Sorting', 'Drag and Drop'],
  },
  {
    id: 'menu-create-item',
    title: 'Create Menu Item',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/menu-items',
    category: 'menu',
    description: 'Adds a new culinary item with pricing, allergen flags, dietary labels, modifier options, and stock tracking.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        categoryId: 'string (MongoDB ObjectId, required)',
        name: 'string (required)',
        description: 'string (optional)',
        price: 'number (min 0, required)',
        imageUrl: 'string (valid URL, optional)',
        isVeg: 'boolean (default false)',
        isSpicy: 'boolean (default false)',
        preparationTime: 'number (prep duration in mins)',
        tags: 'array of string (e.g. ["Chef Special", "Bestseller"])',
        stockCount: 'number (optional inventory limit)',
        isAvailable: 'boolean (default true)',
      },
      sample: {
        categoryId: '65cb031193e1a02b1f814001',
        name: 'Smoked Burrata & Heirloom Tomatoes',
        description: 'Aged balsamic reduction, cold-pressed basil oil, toasted focaccia',
        price: 18.5,
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef23999',
        isVeg: true,
        isSpicy: false,
        preparationTime: 8,
        tags: ['Chef Special', 'Vegetarian'],
        stockCount: 25,
        isAvailable: true,
      },
    },
    responses: [
      {
        status: 201,
        description: 'Menu item created',
        body: {
          success: true,
          data: {
            id: '65cb061293e1a02b1f817001',
            name: 'Smoked Burrata & Heirloom Tomatoes',
            price: 18.5,
            isAvailable: true,
          },
        },
      },
    ],
    tags: ['Menu', 'Item', 'Create'],
  },
  {
    id: 'menu-toggle-availability',
    title: 'Instant 86ing / Availability Toggle',
    method: 'PATCH',
    path: '/api/v1/restaurants/:restaurantId/menu-items/:itemId/availability',
    category: 'menu',
    description: 'Fast 1-click availability switch designed for waiters and kitchen staff to 86 items in real time without entering complex edit forms.',
    auth: 'Staff',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'itemId', type: 'string', required: true, description: 'Menu Item ID' },
    ],
    requestBody: {
      schema: {
        isAvailable: 'boolean (required)',
      },
      sample: {
        isAvailable: false,
      },
    },
    responses: [
      {
        status: 200,
        description: 'Item availability switched and broadcasted to active menus',
        body: {
          success: true,
          data: {
            itemId: '65cb061293e1a02b1f817001',
            isAvailable: false,
          },
          message: 'Item marked as 86 / Sold Out',
        },
      },
    ],
    tags: ['Menu', '86ing', 'Staff Fast Action'],
  },

  // 4. FLOOR ORDERS & SESSIONS
  {
    id: 'orders-list-active',
    title: 'List Active Floor Orders',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/orders/active',
    category: 'orders',
    description: 'Retrieves all ongoing dining floor orders grouped by table number and session status, excluding settled and cancelled orders.',
    auth: 'Staff',
    featureFlag: 'ordering',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Active floor orders returned',
        body: {
          success: true,
          data: [
            {
              id: '65cb040093e1a02b1f815001',
              orderNumber: '#1042',
              tableNumber: '14',
              status: 'PREPARING',
              roundNumber: 2,
              elapsedMinutes: 8,
              items: [
                { name: 'Truffle & Wild Funghi', quantity: 2, status: 'PREPARING' },
              ],
              totalAmount: 52.8,
            },
          ],
        },
      },
    ],
    tags: ['Orders', 'Floor', 'Active'],
  },
  {
    id: 'orders-update-status',
    title: 'Transition Order Status',
    method: 'PATCH',
    path: '/api/v1/restaurants/:restaurantId/orders/:orderId/status',
    category: 'orders',
    description: 'Transitions order through standard restaurant state machine: PLACED -> ACCEPTED -> PREPARING -> READY -> SERVED -> COMPLETED.',
    auth: 'Staff',
    featureFlag: 'ordering',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    ],
    requestBody: {
      schema: {
        status: 'string (enum: "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED", required)',
      },
      sample: {
        status: 'READY',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Status updated and socket alert fired',
        body: {
          success: true,
          data: {
            orderId: '65cb040093e1a02b1f815001',
            status: 'READY',
            updatedAt: '2026-08-10T17:38:00Z',
          },
        },
      },
    ],
    tags: ['Orders', 'Status', 'Workflow'],
  },
  {
    id: 'orders-counter-pos',
    title: 'Rapid Counter / POS Order Entry',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/orders/counter',
    category: 'orders',
    description: 'Allows floor staff to quickly key in manual walk-in or counter orders with immediate payment settlement.',
    auth: 'Staff',
    featureFlag: 'ordering',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        tableId: 'string (optional for walk-ins)',
        customerName: 'string (optional)',
        customerPhone: 'string (optional)',
        items: 'array of order items (required)',
        paymentMethod: 'string ("CASH" | "UPI" | "CARD" | "UNPAID")',
      },
      sample: {
        customerName: 'Marcus Vance',
        items: [{ menuItemId: '65cb035593e1a02b1f814101', quantity: 1 }],
        paymentMethod: 'UPI',
      },
    },
    responses: [
      {
        status: 201,
        description: 'Counter order created and printed',
        body: {
          success: true,
          data: {
            orderId: '65cb071093e1a02b1f818001',
            orderNumber: '#1043',
            status: 'COMPLETED',
            totalAmount: 26.4,
          },
        },
      },
    ],
    tags: ['Orders', 'POS', 'Counter'],
  },
  {
    id: 'orders-close-session',
    title: 'Close Table Session & Settle Bill',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/table-sessions/:sessionId/close',
    category: 'orders',
    description: 'Calculates the final multi-round bill total, applies optional manager discounts, records payment mode, and closes the table session.',
    auth: 'Staff',
    featureFlag: 'ordering',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'sessionId', type: 'string', required: true, description: 'Table Session ID' },
    ],
    requestBody: {
      schema: {
        paymentMethod: 'string (enum: "CASH" | "UPI" | "CARD" | "ONLINE", required)',
        discountAmount: 'number (optional discount in currency)',
        discountReason: 'string (optional)',
      },
      sample: {
        paymentMethod: 'CARD',
        discountAmount: 5.0,
        discountReason: 'VIP Hospitality Card',
      },
    },
    responses: [
      {
        status: 200,
        description: 'Table session settled and closed',
        body: {
          success: true,
          data: {
            sessionId: '65cb027a93e1a02b1f813500',
            status: 'CLOSED',
            totalPaid: 47.8,
            closedAt: '2026-08-10T17:40:00Z',
          },
        },
      },
    ],
    tags: ['Orders', 'Bill Settlement', 'Cashier'],
  },

  // 5. KITCHEN DISPLAY SYSTEM (KDS)
  {
    id: 'kds-active-tickets',
    title: 'Get Active Kitchen KDS Tickets',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/kds/tickets',
    category: 'kds',
    description: 'Provides real-time ticket stream for kitchen display monitors, calculated elapsed cook time, preparation alert levels (Green, Amber, Red/Urgent), and item-level checkbox status.',
    auth: 'Staff',
    featureFlag: 'kds',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Active kitchen tickets returned',
        body: {
          success: true,
          data: [
            {
              orderId: '65cb040093e1a02b1f815001',
              ticketNumber: '#1042',
              tableNumber: '14',
              roundNumber: 2,
              elapsedSeconds: 480,
              urgencyLevel: 'NORMAL',
              items: [
                {
                  itemIndex: 0,
                  name: 'Truffle & Wild Funghi',
                  quantity: 2,
                  status: 'PREPARING',
                  instructions: 'Well done crust please',
                },
              ],
            },
          ],
        },
      },
    ],
    tags: ['KDS', 'Kitchen', 'Chef Display'],
  },
  {
    id: 'kds-bump-ticket',
    title: 'Bump / Complete KDS Ticket',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/kds/tickets/:orderId/bump',
    category: 'kds',
    description: 'Marks an order as fully prepared and cleared from the active chef station screen.',
    auth: 'Staff',
    featureFlag: 'kds',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Ticket bumped and notified to runners',
        body: {
          success: true,
          message: 'Ticket #1042 bumped successfully',
        },
      },
    ],
    tags: ['KDS', 'Bump', 'Kitchen'],
  },
  {
    id: 'kds-recall-ticket',
    title: 'Recall Bumped Ticket Back to Station',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/kds/tickets/:orderId/recall',
    category: 'kds',
    description: 'Restores a previously bumped ticket back into the active kitchen display.',
    auth: 'Staff',
    featureFlag: 'kds',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Ticket restored to active KDS stream',
        body: {
          success: true,
          message: 'Ticket recalled to active screen',
        },
      },
    ],
    tags: ['KDS', 'Recall'],
  },

  // 6. RESTAURANT OPERATIONS & FLAGS
  {
    id: 'restaurant-get-profile',
    title: 'Get Restaurant Profile & Brand Settings',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId',
    category: 'restaurant-profile',
    description: 'Fetches restaurant operational settings, business hours, brand colors, contact info, and tax configurations.',
    auth: 'Staff',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Profile returned',
        body: {
          success: true,
          data: {
            id: '65cb01f893e1a02b1f812999',
            name: 'Bistro Luxe Downtown',
            slug: 'bistro-luxe',
            currency: 'USD',
            currencySymbol: '$',
            phone: '+15550192834',
            address: '742 Evergreen Terrace, Downtown',
          },
        },
      },
    ],
    tags: ['Restaurant', 'Settings', 'Profile'],
  },
  {
    id: 'restaurant-get-flags',
    title: 'Get Tenant Feature Flags',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/feature-flags',
    category: 'restaurant-profile',
    description: 'Returns active module toggles enabled for this restaurant tenant (e.g. `qr_menu`, `ordering`, `payments`, `waiter_call`, `kds`, `analytics`, `pos_integration`, `api_webhooks`).',
    auth: 'Manager',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Feature flags returned',
        body: {
          success: true,
          data: {
            qr_menu: true,
            ordering: true,
            payments: true,
            waiter_call: true,
            kds: true,
            analytics: true,
            pos_integration: false,
            api_webhooks: true,
          },
        },
      },
    ],
    tags: ['Feature Flags', 'Modules'],
  },
  {
    id: 'restaurant-update-flags',
    title: 'Update Tenant Feature Flags',
    method: 'PATCH',
    path: '/api/v1/restaurants/:restaurantId/feature-flags',
    category: 'restaurant-profile',
    description: 'Enables or disables individual platform modules and capabilities dynamically.',
    auth: 'Manager',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        flags: 'object of boolean feature flag keys',
      },
      sample: {
        flags: {
          pos_integration: true,
          kds: true,
        },
      },
    },
    responses: [
      {
        status: 200,
        description: 'Flags updated',
        body: {
          success: true,
          message: 'Feature flags updated successfully',
        },
      },
    ],
    tags: ['Feature Flags', 'Configuration'],
  },

  // 7. TABLES & QR CODES
  {
    id: 'tables-list',
    title: 'List Dining Tables & QR Codes',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/tables',
    category: 'tables-qr',
    description: 'Returns all configured dining tables, assigned floor zones, QR access tokens, active session statuses, and guest links.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Tables listed',
        body: {
          success: true,
          data: [
            {
              id: '65cb024b93e1a02b1f813001',
              tableNumber: '14',
              token: 'tbl_a89f92d40',
              capacity: 4,
              isActive: true,
              zoneId: '65cb024b93e1a02b1f813002',
              qrUrl: 'https://bistro-luxe.thescanmenu.com/t/tbl_a89f92d40',
            },
          ],
        },
      },
    ],
    tags: ['Tables', 'QR', 'List'],
  },
  {
    id: 'tables-bulk-create',
    title: 'Bulk Generate Tables & QR Tokens',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/tables/bulk',
    category: 'tables-qr',
    description: 'Instantly provisions a sequence of tables (e.g. Tables 1 to 50) with unique cryptographic tokens for laser engraving or printing.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        startNumber: 'number (starting table number, required)',
        count: 'number (total tables to generate, required)',
        capacity: 'number (default capacity)',
        zoneId: 'string (optional zone MongoDB ObjectId)',
      },
      sample: {
        startNumber: 1,
        count: 20,
        capacity: 4,
        zoneId: '65cb024b93e1a02b1f813002',
      },
    },
    responses: [
      {
        status: 201,
        description: '20 tables provisioned with unique tokens',
        body: {
          success: true,
          data: {
            createdCount: 20,
          },
          message: '20 tables successfully created',
        },
      },
    ],
    tags: ['Tables', 'Bulk', 'Provisioning'],
  },
  {
    id: 'tables-get-qr',
    title: 'Render High-Res QR SVG & PNG Vector',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/tables/:tableId/qr',
    category: 'tables-qr',
    description: 'Generates high-resolution vector SVG and PNG QR assets customized with the restaurant branding for tabletop acrylic stands or NFC stickers.',
    auth: 'Manager',
    featureFlag: 'qr_menu',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'tableId', type: 'string', required: true, description: 'Table ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'High-res QR vector and data URI returned',
        body: {
          success: true,
          data: {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">...</svg>',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
            directUrl: 'https://bistro-luxe.thescanmenu.com/t/tbl_a89f92d40',
          },
        },
      },
    ],
    tags: ['Tables', 'QR', 'SVG', 'Vector'],
  },

  // 8. FLOOR ZONES
  {
    id: 'zones-list',
    title: 'List Floor Zones & Dining Areas',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/zones',
    category: 'zones',
    description: 'Retrieves seating sections (Main Dining Room, Rooftop Lounge, Patio, VIP Suite).',
    auth: 'Manager',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Floor zones returned',
        body: {
          success: true,
          data: [
            {
              id: '65cb024b93e1a02b1f813002',
              name: 'Terrace Garden',
              description: 'Outdoor heated seating with garden view',
              tableCount: 12,
            },
          ],
        },
      },
    ],
    tags: ['Zones', 'Floor Plan'],
  },

  // 9. TAXES & SURCHARGES
  {
    id: 'taxes-list',
    title: 'List Taxes & Surcharges',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/taxes',
    category: 'taxes',
    description: 'Retrieves active VAT, GST, service charge, and municipal taxes applied to checkout bills.',
    auth: 'Manager',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Taxes returned',
        body: {
          success: true,
          data: [
            {
              id: '65cb080093e1a02b1f819001',
              name: 'GST',
              percentage: 5.0,
              type: 'PERCENTAGE',
              isInclusive: false,
              isActive: true,
            },
          ],
        },
      },
    ],
    tags: ['Taxes', 'GST', 'VAT', 'Surcharges'],
  },

  // 10. STAFF MANAGEMENT
  {
    id: 'staff-list',
    title: 'List Restaurant Waitstaff & Managers',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/staff',
    category: 'staff',
    description: 'Lists all team members assigned to this restaurant branch with their roles and PIN status.',
    auth: 'Manager',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Staff members listed',
        body: {
          success: true,
          data: [
            {
              id: '65cb085093e1a02b1f819500',
              name: 'Emily Davis',
              email: 'emily@bistroluxe.com',
              role: 'STAFF',
              isActive: true,
            },
          ],
        },
      },
    ],
    tags: ['Staff', 'Roles', 'Waiters'],
  },
  {
    id: 'staff-create',
    title: 'Provision Staff Member with Quick PIN',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/staff',
    category: 'staff',
    description: 'Creates a waiter or supervisor account with a 4-digit quick terminal PIN.',
    auth: 'Manager',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        name: 'string (required)',
        email: 'string (valid email, required)',
        role: 'string ("MANAGER" | "STAFF", required)',
        pin: 'string (4 digits, required)',
      },
      sample: {
        name: 'Carlos Mendez',
        email: 'carlos@bistroluxe.com',
        role: 'STAFF',
        pin: '4821',
      },
    },
    responses: [
      {
        status: 201,
        description: 'Staff account created',
        body: {
          success: true,
          data: {
            id: '65cb088893e1a02b1f819600',
            name: 'Carlos Mendez',
            role: 'STAFF',
          },
        },
      },
    ],
    tags: ['Staff', 'PIN', 'Create'],
  },

  // 11. WAITER CALLS
  {
    id: 'waiter-calls-list',
    title: 'List Floor Assistance Bell Calls',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/waiter-calls',
    category: 'waiter-calls',
    description: 'Returns real-time assistance alerts from dining tables sorted by creation time.',
    auth: 'Staff',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Active assistance calls listed',
        body: {
          success: true,
          data: [
            {
              id: '65cb04ee93e1a02b1f815888',
              tableNumber: '14',
              type: 'WATER',
              status: 'PENDING',
              createdAt: '2026-08-10T17:31:00Z',
            },
          ],
        },
      },
    ],
    tags: ['Waiter Calls', 'Floor Alerts'],
  },
  {
    id: 'waiter-calls-resolve',
    title: 'Resolve Floor Assistance Request',
    method: 'PATCH',
    path: '/api/v1/restaurants/:restaurantId/waiter-calls/:callId/resolve',
    category: 'waiter-calls',
    description: 'Marks table assistance as attended by waitstaff and silences the notification bell.',
    auth: 'Staff',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
      { name: 'callId', type: 'string', required: true, description: 'Call ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Call resolved',
        body: {
          success: true,
          message: 'Assistance request resolved',
        },
      },
    ],
    tags: ['Waiter Calls', 'Resolve'],
  },

  // 12. PAYMENTS & TRANSACTIONS
  {
    id: 'payments-list-transactions',
    title: 'List Payment Transactions',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/payments/transactions',
    category: 'payments',
    description: 'Returns digital payment transaction logs with gateway IDs, settlement states, and amounts.',
    auth: 'Staff',
    featureFlag: 'payments',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    queryParams: [
      { name: 'status', type: 'string', required: false, description: 'SUCCESS | FAILED | PENDING' },
      { name: 'dateFrom', type: 'string', required: false, description: 'ISO date string' },
      { name: 'page', type: 'number', required: false, default: '1', description: 'Page number' },
    ],
    responses: [
      {
        status: 200,
        description: 'Transactions listed',
        body: {
          success: true,
          data: [
            {
              id: 'txn_9918237192',
              orderId: '65cb040093e1a02b1f815001',
              amount: 52.8,
              currency: 'USD',
              method: 'RAZORPAY',
              status: 'SUCCESS',
              createdAt: '2026-08-10T17:35:00Z',
            },
          ],
        },
      },
    ],
    tags: ['Payments', 'Transactions', 'Ledger'],
  },
  {
    id: 'payments-export-csv',
    title: 'Export Settlement Ledger (CSV)',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/payments/transactions/export',
    category: 'payments',
    description: 'Streams a formatted CSV spreadsheet of all settled dining revenue for accounting software like QuickBooks and Xero.',
    auth: 'Manager',
    featureFlag: 'payments',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'CSV file download stream (Content-Type: text/csv)',
        body: {
          file: 'transactions_bistro_luxe_2026_08.csv',
        },
      },
    ],
    tags: ['Payments', 'CSV', 'Export', 'Accounting'],
  },

  // 13. POS INTEGRATIONS
  {
    id: 'pos-petpooja-sync',
    title: 'Trigger Petpooja Catalog Sync',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/integrations/petpooja/sync-menu',
    category: 'pos-integration',
    description: 'Pulls the latest menu catalog, item variants, taxes, and prices directly from the Petpooja POS cloud into The Scan Menu.',
    auth: 'Manager',
    featureFlag: 'pos_integration',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Sync initiated successfully',
        body: {
          success: true,
          data: {
            syncedCategories: 14,
            syncedItems: 86,
            lastSyncedAt: '2026-08-10T17:45:00Z',
          },
          message: 'Menu synchronized with Petpooja POS',
        },
      },
    ],
    tags: ['POS', 'Petpooja', 'Sync'],
  },

  // 14. ANALYTICS & BI
  {
    id: 'analytics-summary',
    title: 'Get Revenue & Performance Summary KPIs',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/analytics/summary',
    category: 'analytics',
    description: 'Calculates key dining indicators: Total Gross Revenue, Total Ticket Volume, Average Order Value (AOV), Average Table Turn Time, and Digital Adoption Rate.',
    auth: 'Manager',
    featureFlag: 'analytics',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    queryParams: [
      { name: 'range', type: 'string', required: false, default: 'today', description: 'today | 7d | 30d | custom' },
    ],
    responses: [
      {
        status: 200,
        description: 'Analytics summary returned',
        body: {
          success: true,
          data: {
            grossRevenue: 4820.5,
            ordersCount: 142,
            averageOrderValue: 33.95,
            avgTableTurnMinutes: 38,
            digitalAdoptionRate: '94.2%',
          },
        },
      },
    ],
    tags: ['Analytics', 'KPIs', 'Revenue'],
  },
  {
    id: 'analytics-peak-hours',
    title: 'Hourly Dining Peak Heatmap',
    method: 'GET',
    path: '/api/v1/restaurants/:restaurantId/analytics/peak-hours',
    category: 'analytics',
    description: 'Returns 24-hour distribution of table covers and order volume to optimize kitchen prep and staff scheduling.',
    auth: 'Manager',
    featureFlag: 'analytics',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    responses: [
      {
        status: 200,
        description: 'Heatmap data points returned',
        body: {
          success: true,
          data: [
            { hour: '12:00', orderVolume: 28, revenue: 950.0 },
            { hour: '13:00', orderVolume: 35, revenue: 1240.0 },
            { hour: '19:00', orderVolume: 42, revenue: 1680.0 },
            { hour: '20:00', orderVolume: 39, revenue: 1450.0 },
          ],
        },
      },
    ],
    tags: ['Analytics', 'Heatmap', 'Peak Hours'],
  },

  // 15. DEVELOPER HUB & WEBHOOKS
  {
    id: 'developer-create-api-key',
    title: 'Generate Scoped API Key',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/developer/api-keys',
    category: 'developer',
    description: 'Generates a new cryptographically secured API key with explicit scope limits (e.g. `menu:read`, `orders:read`, `orders:write`, `webhooks:manage`).',
    auth: 'Manager',
    featureFlag: 'api_webhooks',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        name: 'string (description, required)',
        scopes: 'array of string (valid scopes, required)',
      },
      sample: {
        name: 'Delivery Kiosk Integration',
        scopes: ['menu:read', 'orders:read', 'orders:write'],
      },
    },
    responses: [
      {
        status: 201,
        description: 'API key generated (secret shown only once)',
        body: {
          success: true,
          data: {
            id: 'key_65cb090012',
            name: 'Delivery Kiosk Integration',
            apiKey: 'tsm_live_9a8b7c6d5e4f3a2b1...',
            scopes: ['menu:read', 'orders:read', 'orders:write'],
            createdAt: '2026-08-10T17:50:00Z',
          },
        },
      },
    ],
    tags: ['Developer', 'API Key', 'Security'],
  },
  {
    id: 'developer-register-webhook',
    title: 'Subscribe Outbound Webhook',
    method: 'POST',
    path: '/api/v1/restaurants/:restaurantId/developer/webhooks',
    category: 'developer',
    description: 'Registers an HTTPS endpoint to receive real-time JSON webhooks with SHA-256 HMAC signatures on restaurant events.',
    auth: 'Manager',
    featureFlag: 'api_webhooks',
    pathParams: [
      { name: 'restaurantId', type: 'string', required: true, description: 'Tenant Restaurant ID' },
    ],
    requestBody: {
      schema: {
        url: 'string (valid HTTPS URL, required)',
        events: 'array of string ("order.created" | "order.status_changed" | "payment.successful", required)',
      },
      sample: {
        url: 'https://webhook.site/demo-endpoint',
        events: ['order.created', 'order.status_changed'],
      },
    },
    responses: [
      {
        status: 201,
        description: 'Webhook registered',
        body: {
          success: true,
          data: {
            id: 'whk_65cb095033',
            url: 'https://webhook.site/demo-endpoint',
            events: ['order.created', 'order.status_changed'],
            secret: 'whsec_a8b9c0d1e2f3...',
          },
        },
      },
    ],
    tags: ['Developer', 'Webhooks', 'HMAC'],
  },

  // 16. OPENAPI GATEWAY (EXTERNAL)
  {
    id: 'openapi-get-menu',
    title: 'OpenAPI: Get Menu Catalog (Public Gateway)',
    method: 'GET',
    path: '/api/v1/openapi/menu',
    category: 'openapi',
    description: 'External API gateway endpoint authenticated via API Key (`X-API-Key` or `Authorization: Bearer <key>`) with scope `menu:read`.',
    auth: 'API Key',
    headers: [
      { name: 'X-API-Key', type: 'string', required: true, description: 'Client secret API Key' },
    ],
    responses: [
      {
        status: 200,
        description: 'Complete menu catalog returned',
        body: {
          success: true,
          data: {
            restaurant: 'Bistro Luxe Downtown',
            categories: [
              {
                id: 'cat_01',
                name: 'Wood-Fired Artisanal Pizzas',
                items: [{ id: 'itm_01', name: 'Truffle & Wild Funghi', price: 24.0 }],
              },
            ],
          },
        },
      },
    ],
    tags: ['OpenAPI', 'Gateway', 'External'],
  },
  {
    id: 'openapi-get-orders',
    title: 'OpenAPI: Query Orders Feed',
    method: 'GET',
    path: '/api/v1/openapi/orders',
    category: 'openapi',
    description: 'Allows 3rd party aggregators and accounting backends to pull orders stream filtered by timestamp or status.',
    auth: 'API Key',
    headers: [
      { name: 'X-API-Key', type: 'string', required: true, description: 'Requires orders:read scope' },
    ],
    queryParams: [
      { name: 'status', type: 'string', required: false, description: 'Filter by order status' },
      { name: 'since', type: 'string', required: false, description: 'ISO 8601 timestamp' },
    ],
    responses: [
      {
        status: 200,
        description: 'Order list returned',
        body: {
          success: true,
          data: [
            {
              orderId: '65cb040093e1a02b1f815001',
              orderNumber: '#1042',
              status: 'COMPLETED',
              totalAmount: 52.8,
            },
          ],
        },
      },
    ],
    tags: ['OpenAPI', 'Orders', 'Query'],
  },

  // 17. SUBSCRIPTION & BILLING
  {
    id: 'sub-list-plans',
    title: 'List SaaS Subscription Tiers',
    method: 'GET',
    path: '/api/v1/subscription',
    category: 'subscription',
    description: 'Lists all available subscription tiers (Basic, Pro, Enterprise) with their table limits, feature entitlements, and pricing.',
    auth: 'Staff',
    responses: [
      {
        status: 200,
        description: 'Subscription tiers list',
        body: {
          success: true,
          data: [
            {
              id: 'plan_pro',
              name: 'Professional Tier',
              monthlyPrice: 49,
              tableLimit: 50,
              features: ['qr_menu', 'ordering', 'payments', 'waiter_call', 'kds', 'analytics'],
            },
          ],
        },
      },
    ],
    tags: ['Subscription', 'Plans', 'Pricing'],
  },

  // 18. SUPER ADMIN PLATFORM HUB
  {
    id: 'admin-platform-stats',
    title: 'Global Platform KPI Dashboard',
    method: 'GET',
    path: '/api/v1/admin/stats',
    category: 'admin',
    description: 'Super Admin telemetry returning active restaurant count, total tables managed, global order volume, gross payment processing throughput, and server load.',
    auth: 'Super Admin',
    responses: [
      {
        status: 200,
        description: 'Platform stats returned',
        body: {
          success: true,
          data: {
            totalRestaurants: 128,
            activeRestaurants: 124,
            totalTables: 2450,
            monthlyGrossVolume: '$384,200',
            activeSockets: 412,
          },
        },
      },
    ],
    tags: ['Super Admin', 'Platform', 'Telemetry'],
  },
  {
    id: 'admin-provision-restaurant',
    title: '1-Click Automated Restaurant Onboarding',
    method: 'POST',
    path: '/api/v1/admin/restaurants/provision',
    category: 'admin',
    description: 'Provisions a new tenant database entry, creates the owner manager account, configures default floor zones, and provisions standard tables with QR tokens in an atomic transaction.',
    auth: 'Super Admin',
    requestBody: {
      schema: {
        name: 'string (restaurant name, required)',
        slug: 'string (subdomain slug, required)',
        ownerName: 'string (required)',
        ownerEmail: 'string (required)',
        ownerPassword: 'string (required)',
        currency: 'string (e.g. "USD", "INR")',
        tableCount: 'number (initial table count)',
      },
      sample: {
        name: 'L’Osteria Del Mare',
        slug: 'del-mare',
        ownerName: 'Marco Rossi',
        ownerEmail: 'marco@delmare.com',
        ownerPassword: 'TemporaryPass#2026',
        currency: 'EUR',
        tableCount: 25,
      },
    },
    responses: [
      {
        status: 201,
        description: 'Restaurant provisioned successfully',
        body: {
          success: true,
          data: {
            restaurantId: '65cb100093e1a02b1f820001',
            slug: 'del-mare',
            managerId: '65cb100093e1a02b1f820002',
            tablesGenerated: 25,
          },
          message: 'Restaurant tenant provisioned successfully',
        },
      },
    ],
    tags: ['Super Admin', 'Provisioning', 'Onboarding'],
  },

  // 19. INBOUND WEBHOOKS
  {
    id: 'webhooks-razorpay',
    title: 'Inbound Razorpay Payment Webhook',
    method: 'POST',
    path: '/api/v1/webhooks/razorpay',
    category: 'inbound-webhooks',
    description: 'Processes raw webhook events from Razorpay gateway (`payment.captured`, `order.paid`) using HMAC signature validation (`x-razorpay-signature`).',
    auth: 'Public',
    headers: [
      { name: 'x-razorpay-signature', type: 'string', required: true, description: 'HMAC SHA256 Signature' },
    ],
    responses: [
      {
        status: 200,
        description: 'Webhook processed',
        body: {
          status: 'ok',
        },
      },
    ],
    tags: ['Inbound Webhooks', 'Razorpay', 'Payment Callback'],
  },

  // 20. HEALTH PROBES
  {
    id: 'health-overview',
    title: 'System Health & MongoDB Connection Heartbeat',
    method: 'GET',
    path: '/health',
    category: 'health',
    description: 'System health probe returning uptime, database readyState, environment, and degradation status.',
    auth: 'Public',
    responses: [
      {
        status: 200,
        description: 'System operational',
        body: {
          success: true,
          data: {
            status: 'ok',
            uptime: 148293.4,
            environment: 'production',
            timestamp: '2026-08-10T17:55:00Z',
            services: {
              mongodb: 'connected',
            },
          },
          message: 'Server is healthy',
        },
      },
    ],
    tags: ['Health', 'Heartbeat', 'Uptime'],
  },
  {
    id: 'health-liveness',
    title: 'Container Liveness Probe',
    method: 'GET',
    path: '/health/liveness',
    category: 'health',
    description: 'Standard container orchestration probe returning 200 OK if the Node.js event loop is alive.',
    auth: 'Public',
    responses: [
      {
        status: 200,
        description: 'Server process alive',
        body: { status: 'alive' },
      },
    ],
    tags: ['Health', 'Kubernetes', 'Liveness'],
  },
  {
    id: 'health-readiness',
    title: 'Container Readiness Probe',
    method: 'GET',
    path: '/health/readiness',
    category: 'health',
    description: 'Verifies whether backend database and socket connections are fully initialized before load balancers route traffic.',
    auth: 'Public',
    responses: [
      {
        status: 200,
        description: 'Ready to receive traffic',
        body: { status: 'ready', dbConnected: true },
      },
    ],
    tags: ['Health', 'Readiness'],
  },
];

export const SOCKET_EVENTS: SocketEventDoc[] = [
  {
    name: 'join_restaurant',
    direction: 'Client to Server',
    room: 'restaurant:<restaurantId>',
    description: 'Authenticated staff and managers join their restaurant room to receive real-time order alerts, floor calls, and inventory updates.',
    payload: {
      restaurantId: '65cb01f893e1a02b1f812999',
    },
  },
  {
    name: 'join_order',
    direction: 'Client to Server',
    room: 'order:<orderId>',
    description: 'Public guests subscribe to their specific order channel to watch kitchen status progression in real-time.',
    payload: {
      orderId: '65cb040093e1a02b1f815001',
    },
  },
  {
    name: 'join_session',
    direction: 'Client to Server',
    room: 'session:<sessionId>',
    description: 'Guests subscribe to multi-round table sessions to watch item additions by party members and bill updates.',
    payload: {
      sessionId: '65cb027a93e1a02b1f813500',
    },
  },
  {
    name: 'join_table',
    direction: 'Client to Server',
    room: 'table:<tableToken>',
    description: 'Guests subscribe to their table to receive waiter call acknowledgment confirmations.',
    payload: {
      tableToken: 'tbl_a89f92d40',
    },
  },
  {
    name: 'order:created',
    direction: 'Server to Client',
    room: 'restaurant:<restaurantId>',
    description: 'Emitted when a new order is submitted. Triggers audio chimes on KDS screens and adds card to active orders.',
    payload: {
      orderId: '65cb040093e1a02b1f815001',
      orderNumber: '#1042',
      tableNumber: '14',
      itemsCount: 2,
      totalAmount: 52.8,
    },
  },
  {
    name: 'order:status_updated',
    direction: 'Server to Client',
    room: 'order:<orderId> & restaurant:<restaurantId>',
    description: 'Emitted when order moves to PREPARING, READY, SERVED, or COMPLETED.',
    payload: {
      orderId: '65cb040093e1a02b1f815001',
      status: 'READY',
      updatedAt: '2026-08-10T17:38:00Z',
    },
  },
  {
    name: 'order:item_status_updated',
    direction: 'Server to Client',
    room: 'order:<orderId> & restaurant:<restaurantId>',
    description: 'Emitted when a chef ticks off individual line items in a ticket.',
    payload: {
      orderId: '65cb040093e1a02b1f815001',
      itemIndex: 0,
      status: 'PREPARING',
    },
  },
  {
    name: 'session:updated',
    direction: 'Server to Client',
    room: 'session:<sessionId> & restaurant:<restaurantId>',
    description: 'Emitted when table session subtotal, items, or round counts change.',
    payload: {
      sessionId: '65cb027a93e1a02b1f813500',
      totalAmount: 104.5,
      roundCount: 3,
    },
  },
  {
    name: 'waiter_call:created',
    direction: 'Server to Client',
    room: 'restaurant:<restaurantId> & table:<tableToken>',
    description: 'Emitted when a patron hits the floor assistance bell.',
    payload: {
      callId: '65cb04ee93e1a02b1f815888',
      tableNumber: '14',
      type: 'WATER',
    },
  },
  {
    name: 'waiter_call:resolved',
    direction: 'Server to Client',
    room: 'restaurant:<restaurantId> & table:<tableToken>',
    description: 'Emitted when staff acknowledges or clears a waiter call.',
    payload: {
      callId: '65cb04ee93e1a02b1f815888',
      status: 'RESOLVED',
    },
  },
  {
    name: 'inventory:updated',
    direction: 'Server to Client',
    room: 'restaurant:<restaurantId>',
    description: 'Emitted when an item is 86ed or stock counts are modified.',
    payload: {
      itemId: '65cb061293e1a02b1f817001',
      isAvailable: false,
    },
  },
];
