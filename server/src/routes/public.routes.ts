import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';
import { WaiterCallController } from '../controllers/waiterCall.controller';
import { tenantResolverMiddleware } from '../middleware/tenantResolver.middleware';
import { tableResolverMiddleware } from '../middleware/tableResolver.middleware';
import rateLimit from 'express-rate-limit';
import config from '../config';

const router = Router();
const publicController = new PublicController();
const waiterCallController = new WaiterCallController();

const isTest = config.app.isTest;

// Tight public rate limiters to prevent API abuse and order spamming (disabled or relaxed in tests)
const orderCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isTest ? 10000 : 5, // max 5 orders per 10 minutes per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many order placements from this connection. Please wait 10 minutes before placing another order.',
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const waiterCallLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isTest ? 10000 : 5, // max 5 waiter calls per 5 minutes per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many floor assistance requests from this connection. Please wait 5 minutes.',
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicGetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isTest ? 10000 : 60, // max 60 read requests per 1 minute per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this connection. Please wait 1 minute.',
      details: null,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ====================================================
// NEW TENANT-AWARE SUBDOMAIN ROUTES (Host-Based)
// ====================================================
router.get('/table/:tableToken', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.resolveTable);
router.get('/menu', publicGetLimiter, tenantResolverMiddleware, publicController.getSessionlessMenu);
router.get('/table/:tableToken/menu', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.getMenu);
router.get('/taxes', publicGetLimiter, tenantResolverMiddleware, publicController.getTaxes);

router.post('/table/:tableToken/orders', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.createOrder);
router.post('/orders', orderCreationLimiter, tenantResolverMiddleware, publicController.createSessionlessOrder);
router.post('/table/:tableToken/payments/intent', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.createPaymentIntent);
router.post('/payments/intent', orderCreationLimiter, tenantResolverMiddleware, publicController.createPaymentIntent);
router.post('/table/:tableToken/clear-session', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.clearTableSession);

// ====================================================
// LEGACY PATH-BASED ROUTES (Backward Compatibility)
// ====================================================
router.get('/restaurants/:restaurantSlug/tables/:tableToken', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.resolveTable);
router.get('/restaurants/:restaurantSlug/tables/:tableToken/menu', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.getMenu);
router.get('/restaurants/:restaurantSlug/menu', publicGetLimiter, tenantResolverMiddleware, publicController.getSessionlessMenu);

// Public taxes (Legacy)
router.get('/restaurants/:restaurantId/taxes', publicGetLimiter, publicController.getTaxes);

// Public Order Creation & Payment Intent (Legacy)
router.post('/restaurants/:restaurantSlug/tables/:tableToken/orders', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.createOrder);
router.post('/restaurants/:restaurantSlug/orders', orderCreationLimiter, tenantResolverMiddleware, publicController.createSessionlessOrder);
router.post('/restaurants/:restaurantSlug/tables/:tableToken/payments/intent', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.createPaymentIntent);
router.post('/restaurants/:restaurantSlug/payments/intent', orderCreationLimiter, tenantResolverMiddleware, publicController.createPaymentIntent);
router.post('/restaurants/:restaurantSlug/tables/:tableToken/clear-session', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.clearTableSession);

// Session & Order status lookups by ID
router.get('/orders/:orderId', publicGetLimiter, publicController.getOrder);
router.get('/orders/:orderId/status', publicGetLimiter, publicController.getOrderStatus);
router.get('/table-sessions/:sessionId', publicGetLimiter, publicController.getTableSession);

// Public Waiter Call Endpoints
router.post('/tables/:tableToken/waiter-call', waiterCallLimiter, waiterCallController.createWaiterCall);
router.get('/tables/:tableToken/waiter-call/active', publicGetLimiter, waiterCallController.getActiveWaiterCall);

export default router;
