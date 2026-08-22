import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';
import { WaiterCallController } from '../controllers/waiterCall.controller';
import { liveDisplayController } from '../controllers/liveDisplay.controller';
import { tenantResolverMiddleware } from '../middleware/tenantResolver.middleware';
import { tableResolverMiddleware } from '../middleware/tableResolver.middleware';
import { optionalCustomerAuth } from '../middleware/customerAuth';
import rateLimit from 'express-rate-limit';
import config from '../config';

const router = Router();
const publicController = new PublicController();
const waiterCallController = new WaiterCallController();

const isTest = config.app.isTest;

// Tight public rate limiters to prevent API abuse and order spamming (relaxed in tests)
const orderCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isTest ? 10000 : 20, // max 20 orders per 10 minutes per IP
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many order placements from this connection. Please wait a few minutes.',
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
// TENANT-AWARE SUBDOMAIN ROUTES (Host-Based)
// ====================================================
router.get('/table/:tableToken', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.resolveTable);
router.post('/table/:tableToken/join', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.joinSession);
router.get('/menu', publicGetLimiter, tenantResolverMiddleware, publicController.getSessionlessMenu);
router.get('/table/:tableToken/menu', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.getMenu);
router.get('/taxes', publicGetLimiter, tenantResolverMiddleware, publicController.getTaxes);

// Shared table session & orders (Hardened against IDOR)
router.get('/table/:tableToken/session', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, optionalCustomerAuth, publicController.getTableSession);
router.get('/table/:tableToken/orders/:orderId', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, optionalCustomerAuth, publicController.getOrder);
router.get('/table/:tableToken/orders/:orderId/status', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.getOrderStatus);

router.post('/table/:tableToken/orders', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, optionalCustomerAuth, publicController.createOrder);
router.post('/table/:tableToken/checkout/prepaid', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.createPrepaidCheckout);
router.post('/checkout/prepaid/confirm', orderCreationLimiter, publicController.confirmPrepaidPayment);
router.post('/orders', orderCreationLimiter, tenantResolverMiddleware, optionalCustomerAuth, publicController.createSessionlessOrder);

// Clear session endpoint is disabled for public unauthenticated callers
router.post('/table/:tableToken/clear-session', publicController.clearTableSession);

// ====================================================
// LEGACY PATH-BASED ROUTES (Backward Compatibility)
// ====================================================
router.get('/restaurants/:restaurantSlug/tables/:tableToken', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.resolveTable);
router.post('/restaurants/:restaurantSlug/tables/:tableToken/join', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.joinSession);
router.get('/restaurants/:restaurantSlug/tables/:tableToken/menu', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.getMenu);
router.get('/restaurants/:restaurantSlug/menu', publicGetLimiter, tenantResolverMiddleware, publicController.getSessionlessMenu);

// Legacy shared table session & orders
router.get('/restaurants/:restaurantSlug/tables/:tableToken/session', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, optionalCustomerAuth, publicController.getTableSession);
router.get('/restaurants/:restaurantSlug/tables/:tableToken/orders/:orderId', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, optionalCustomerAuth, publicController.getOrder);
router.get('/restaurants/:restaurantSlug/tables/:tableToken/orders/:orderId/status', publicGetLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.getOrderStatus);

// Public taxes (Legacy)
router.get('/restaurants/:restaurantId/taxes', publicGetLimiter, publicController.getTaxes);

// Public Order Creation & Prepaid Checkout (Legacy)
router.post('/restaurants/:restaurantSlug/tables/:tableToken/orders', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, optionalCustomerAuth, publicController.createOrder);
router.post('/restaurants/:restaurantSlug/tables/:tableToken/checkout/prepaid', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.createPrepaidCheckout);
router.post('/restaurants/:restaurantSlug/orders', orderCreationLimiter, tenantResolverMiddleware, optionalCustomerAuth, publicController.createSessionlessOrder);
router.post('/restaurants/:restaurantSlug/tables/:tableToken/clear-session', publicController.clearTableSession);

// Bill requests and reopening
router.post('/table/:tableToken/bill/request', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.requestBill);
router.post('/table-sessions/:sessionId/bill/request', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.requestBill);
router.post('/table-sessions/:sessionId/reopen', orderCreationLimiter, tenantResolverMiddleware, publicController.reopenSession);
router.post('/restaurants/:restaurantSlug/table-sessions/:sessionId/bill/request', orderCreationLimiter, tenantResolverMiddleware, tableResolverMiddleware, publicController.requestBill);
router.post('/restaurants/:restaurantSlug/table-sessions/:sessionId/reopen', orderCreationLimiter, tenantResolverMiddleware, publicController.reopenSession);

// Backwards-compatible session & order status lookups (sanitized and hardened)
router.get('/orders/:orderId', publicGetLimiter, optionalCustomerAuth, publicController.getOrder);
router.get('/orders/:orderId/status', publicGetLimiter, publicController.getOrderStatus);
router.get('/table-sessions/:sessionId', publicGetLimiter, optionalCustomerAuth, publicController.getTableSession);

// Public Waiter Call Endpoints
router.post('/tables/:tableToken/waiter-call', waiterCallLimiter, waiterCallController.createWaiterCall);
router.get('/tables/:tableToken/waiter-call/active', publicGetLimiter, waiterCallController.getActiveWaiterCall);

// Public Customer Live Display (TV Status Board)
router.get('/live-display', publicGetLimiter, tenantResolverMiddleware, (req, res, next) => {
  const restaurantSlug = req.restaurant?.slug || (req.restaurant as any)?._id?.toString();
  req.params.slugOrId = restaurantSlug;
  liveDisplayController.getDisplayData(req, res, next);
});
router.get('/restaurants/:slugOrId/live-display', publicGetLimiter, liveDisplayController.getDisplayData);

export default router;
