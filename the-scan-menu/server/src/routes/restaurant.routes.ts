import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import featureFlagController from '../controllers/featureFlag.controller';
import integrationController from '../controllers/integration.controller';
import kdsController from '../controllers/kds.controller';
import { requireFeature } from '../middleware/featureFlag';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';

// Restaurant routes: Configured to support MANAGER, STAFF (Captain Mobile App), and SUPER_ADMIN
const router = Router({ mergeParams: true });
const restaurantController = new RestaurantController();

// Require auth at the router level
router.use(requireAuth as any);

// Feature Flag routes (All roles can view active flags; Super Admin only can update)
router.get('/:restaurantId/feature-flags', requireRestaurantAccess as any, featureFlagController.getFeatureFlags);
router.patch('/:restaurantId/feature-flags', requireRestaurantAccess as any, requireRole('SUPER_ADMIN') as any, featureFlagController.updateFeatureFlags);

// Profile routes (Staff can view, Managers/Super Admins can edit)
router.get('/:restaurantId', requireRestaurantAccess as any, restaurantController.getRestaurantProfile);
router.patch('/:restaurantId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.editRestaurantProfile);

// Tables routes (Staff can view and update operational status, Manager/Super Admin can manage layout)
router.get('/:restaurantId/tables', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.listTables);
router.post('/:restaurantId/tables', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createTable);
router.post('/:restaurantId/tables/bulk', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.bulkCreateTables);
router.patch('/:restaurantId/tables/:tableId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.editTable);
router.delete('/:restaurantId/tables/:tableId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteTable);
router.patch('/:restaurantId/tables/:tableId/activate', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.activateTable);
router.patch('/:restaurantId/tables/:tableId/deactivate', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.deactivateTable);
router.post('/:restaurantId/tables/clear', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.clearTables);
router.post('/:restaurantId/tables/reserve', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.reserveTables);
router.patch('/:restaurantId/tables/:tableId/status', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.updateTableStatus);
router.post('/:restaurantId/tables/:tableId/regenerate-qr', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.regenerateTableQr);

// GET returns SVG + PNG details for the QR
router.get('/:restaurantId/tables/:tableId/qr', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.getTableQr);

// Table Zones Routes (Staff can view, Manager/Super Admin can manage)
router.get('/:restaurantId/zones', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.listZones);
router.post('/:restaurantId/zones', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createZone);
router.patch('/:restaurantId/zones/:zoneId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.updateZone);
router.delete('/:restaurantId/zones/:zoneId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteZone);

// Taxes Routes (Staff can view, Manager/Super Admin can configure)
router.get('/:restaurantId/taxes', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, restaurantController.listTaxes);
router.post('/:restaurantId/taxes', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createTax);
router.patch('/:restaurantId/taxes/:taxId', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.updateTax);
router.delete('/:restaurantId/taxes/:taxId', requireFeature('ordering') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteTax);


// Customer Directory Routes (Manager/Super Admin only)
router.get('/:restaurantId/customers', requireFeature('crm') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.listCustomers);
router.get('/:restaurantId/customers/:customerId', requireFeature('crm') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.getCustomerDetails);

// Waiter Staff Management Endpoints (Manager-only)
router.post('/:restaurantId/staff', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.createStaff);
router.get('/:restaurantId/staff', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.listStaff);
router.patch('/:restaurantId/staff/:staffId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.updateStaff);
router.delete('/:restaurantId/staff/:staffId', requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, restaurantController.deleteStaff);

// POS PIN Fast Unlock & Manager Authorization Endpoints
router.post('/:restaurantId/pos/unlock', requireAuth as any, requireRestaurantAccess as any, restaurantController.unlockPosByPin);
router.post('/:restaurantId/pos/verify-manager-pin', requireAuth as any, requireRestaurantAccess as any, restaurantController.verifyManagerPin);
// POS Integration Routes (Manager/Super Admin only)
router.get('/:restaurantId/integrations/sync-logs', requireFeature('pos_integration') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, integrationController.getSyncLogs);
router.get('/:restaurantId/integrations/config', requireFeature('pos_integration') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, integrationController.getIntegrationConfig);
router.patch('/:restaurantId/integrations/petpooja/config', requireFeature('pos_integration') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, integrationController.updatePetpoojaConfig);
router.post('/:restaurantId/integrations/petpooja/sync-menu', requireFeature('pos_integration') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, integrationController.triggerMenuSync);

// Kitchen Display System (KDS) Routes (Staff, Manager, Super Admin)
router.get('/:restaurantId/kds/tickets', requireAuth as any, requireFeature('kds') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, kdsController.getActiveTickets);
router.get('/:restaurantId/kds/history', requireAuth as any, requireFeature('kds') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, kdsController.getBumpedHistory);
router.patch('/:restaurantId/kds/tickets/:orderId/items/:itemIndex/status', requireAuth as any, requireFeature('kds') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, kdsController.updateItemStatus);
router.post('/:restaurantId/kds/tickets/:orderId/bump', requireAuth as any, requireFeature('kds') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, kdsController.bumpTicket);
router.post('/:restaurantId/kds/tickets/:orderId/recall', requireAuth as any, requireFeature('kds') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, kdsController.recallTicket);

export default router;
