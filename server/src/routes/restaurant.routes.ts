import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import featureFlagController from '../controllers/featureFlag.controller';
import integrationController from '../controllers/integration.controller';
import { requireFeature } from '../middleware/featureFlag';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';

const router = Router({ mergeParams: true });
const restaurantController = new RestaurantController();

// Require auth at the router level
router.use(requireAuth as any);

// Feature Flag routes (Manager/Super Admin only)
router.get('/:restaurantId/feature-flags', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, featureFlagController.getFeatureFlags);
router.patch('/:restaurantId/feature-flags', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, featureFlagController.updateFeatureFlags);

// Profile routes (Staff can view, Managers/Super Admins can edit)
router.get('/:restaurantId', requireRestaurantAccess as any, restaurantController.getRestaurantProfile);
router.patch('/:restaurantId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.editRestaurantProfile);

// Tables routes (Manager/Super Admin only)
router.get('/:restaurantId/tables', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.listTables);
router.post('/:restaurantId/tables', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createTable);
router.post('/:restaurantId/tables/bulk', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.bulkCreateTables);
router.patch('/:restaurantId/tables/:tableId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.editTable);
router.delete('/:restaurantId/tables/:tableId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteTable);
router.patch('/:restaurantId/tables/:tableId/activate', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.activateTable);
router.patch('/:restaurantId/tables/:tableId/deactivate', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deactivateTable);
router.post('/:restaurantId/tables/:tableId/regenerate-qr', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.regenerateTableQr);

// GET returns SVG + PNG details for the QR
router.get('/:restaurantId/tables/:tableId/qr', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.getTableQr);

// Table Zones Routes
router.get('/:restaurantId/zones', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.listZones);
router.post('/:restaurantId/zones', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createZone);
router.patch('/:restaurantId/zones/:zoneId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.updateZone);
router.delete('/:restaurantId/zones/:zoneId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteZone);

// Taxes Routes
router.get('/:restaurantId/taxes', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.listTaxes);
router.post('/:restaurantId/taxes', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createTax);
router.patch('/:restaurantId/taxes/:taxId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.updateTax);
router.delete('/:restaurantId/taxes/:taxId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteTax);


// Waiter Staff Management Endpoints (Manager-only)
router.post('/:restaurantId/staff', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createStaff);
router.get('/:restaurantId/staff', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.listStaff);
router.patch('/:restaurantId/staff/:staffId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.updateStaff);
// POS Integration Sync Logs Route (Manager/Super Admin only)
router.get('/:restaurantId/integrations/sync-logs', requireFeature('pos_integration') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, integrationController.getSyncLogs);

export default router;
