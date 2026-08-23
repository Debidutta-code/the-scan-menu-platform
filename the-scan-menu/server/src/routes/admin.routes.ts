import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
const adminController = new AdminController();

// Require both auth + platform role SUPER_ADMIN
router.use(requireAuth as any, requireRole('SUPER_ADMIN'));

router.get('/stats', adminController.getPlatformStats);
router.get('/analytics', adminController.getPlatformAnalytics);
router.post('/restaurants/provision', adminController.provisionRestaurant);
router.get('/restaurants/:id/onboarding', adminController.getOnboardingProgress);
router.get('/restaurants/:id/setup-audit', adminController.getOutletSetupAudit);
router.patch('/restaurants/:id/settings', adminController.updateOutletSettings);
router.post('/restaurants/:id/seed-demo-menu', adminController.seedDemoMenu);
router.post('/restaurants/:id/apply-tax-preset', adminController.applyTaxPreset);
router.post('/restaurants', adminController.createRestaurant);
router.get('/restaurants', adminController.listRestaurants);
router.get('/restaurants/:id', adminController.getRestaurant);
router.patch('/restaurants/:id', adminController.editRestaurant);
router.patch('/restaurants/:id/suspend', adminController.suspendRestaurant);
router.patch('/restaurants/:id/activate', adminController.activateRestaurant);
router.delete('/restaurants/:id', adminController.deleteRestaurant);
router.post('/restaurants/:id/managers', adminController.assignManager);

// POS Integrations Hub
router.get('/pos/outlets', adminController.getPOSOutlets);
router.get('/pos/sync-logs', adminController.getPOSSyncLogs);
router.post('/pos/:restaurantId/sync-menu', adminController.triggerPOSMenuSync);
router.patch('/pos/:restaurantId/config', adminController.updatePOSConfig);

// Payment Gateways Manager
router.get('/payments/overview', adminController.getPaymentOverview);
router.get('/payments/tenant-configs', adminController.getTenantPaymentConfigs);
router.patch('/payments/restaurants/:restaurantId/methods', adminController.updateTenantPaymentMethods);

// Global Audit Trail
router.get('/audit-logs', adminController.getAuditLogs);


export default router;
