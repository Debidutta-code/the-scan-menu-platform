import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });

router.use(requireAuth as any);
router.use(requireRestaurantAccess as any);
router.use(requireFeature('payments') as any);

// POST /restaurants/:restaurantId/payments/intent
router.post('/intent', paymentController.createIntent);

// GET /restaurants/:restaurantId/payments/transactions
router.get('/transactions', paymentController.listTransactions);

// GET /restaurants/:restaurantId/payments/transactions/export (CSV)
router.get('/transactions/export', requireRole('MANAGER', 'SUPER_ADMIN') as any, paymentController.exportTransactionsCsv);

// GET /restaurants/:restaurantId/payments/transactions/:id
router.get('/transactions/:id', paymentController.getTransaction);

// PATCH /restaurants/:restaurantId/payments/transactions/:id/capture
router.patch('/transactions/:id/capture', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, paymentController.captureTransaction);

// GET /restaurants/:restaurantId/payments/config (Safe Manager/Staff View)
router.get('/config', paymentController.getConfig);

// PATCH /restaurants/:restaurantId/payments/config
router.patch('/config', requireRole('MANAGER', 'SUPER_ADMIN') as any, paymentController.updateConfig);

// POST /restaurants/:restaurantId/payments/verify-razorpay (Server-Side Verified Payment)
router.post('/verify-razorpay', paymentController.verifyRazorpayPayment);

// POST /restaurants/:restaurantId/payments/orders/:orderId/verify-manual (Staff Manual Verification)
router.post('/orders/:orderId/verify-manual', requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, paymentController.verifyManualPayment);

export default router;
