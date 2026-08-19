import { Router } from 'express';
import { MenuController } from '../controllers/menu.controller';
import { requireFeature } from '../middleware/featureFlag';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createCategorySchema,
  updateCategorySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  updateStockSchema,
  createCustomizationGroupSchema,
  updateCustomizationGroupSchema,
} from '../validators/menu.validator';

const router = Router({ mergeParams: true });
const menuController = new MenuController();

// Require authentication at router level
router.use(requireAuth as any);

// Categories (Staff can view, Manager/Super Admin can manage)
router.get('/:restaurantId/categories', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, menuController.listCategories);
router.post(
  '/:restaurantId/categories',
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(createCategorySchema),
  menuController.createCategory
);
router.patch(
  '/:restaurantId/categories/:categoryId',
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(updateCategorySchema),
  menuController.editCategory
);
router.delete('/:restaurantId/categories/:categoryId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, menuController.deleteCategory);
router.patch('/:restaurantId/categories-reorder', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, menuController.reorderCategories);

// Menu Items
router.get('/:restaurantId/menu-items', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any, menuController.listMenuItems);
router.post(
  '/:restaurantId/menu-items',
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(createMenuItemSchema),
  menuController.createMenuItem
);
router.patch(
  '/:restaurantId/menu-items/:itemId',
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(updateMenuItemSchema),
  menuController.editMenuItem
);
router.delete('/:restaurantId/menu-items/:itemId', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, menuController.deleteMenuItem);

// Availability toggle (Manager & Staff allowed for fast 86ing)
router.patch(
  '/:restaurantId/menu-items/:itemId/availability',
  requireFeature('qr_menu') as any,
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any,
  menuController.toggleAvailability
);

// Stock adjustment (Manager only)
router.patch(
  '/:restaurantId/menu-items/:itemId/stock',
  requireFeature('qr_menu') as any,
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(updateStockSchema),
  menuController.updateStock
);

router.patch('/:restaurantId/menu-items-bulk-availability', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, menuController.bulkAvailability);
router.patch('/:restaurantId/menu-items-reorder', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, menuController.reorderMenuItems);

// Customization & Add-on Groups
router.get(
  '/:restaurantId/customization-groups',
  requireFeature('qr_menu') as any,
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'STAFF', 'SUPER_ADMIN') as any,
  menuController.listCustomizationGroups
);
router.post(
  '/:restaurantId/customization-groups',
  requireFeature('qr_menu') as any,
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(createCustomizationGroupSchema),
  menuController.createCustomizationGroup
);
router.put(
  '/:restaurantId/customization-groups/:id',
  requireFeature('qr_menu') as any,
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  validateBody(updateCustomizationGroupSchema),
  menuController.editCustomizationGroup
);
router.delete(
  '/:restaurantId/customization-groups/:id',
  requireFeature('qr_menu') as any,
  requireRestaurantAccess as any,
  requireRole('MANAGER', 'SUPER_ADMIN') as any,
  menuController.deleteCustomizationGroup
);

// Uploads
router.post('/:restaurantId/uploads/signature', requireFeature('qr_menu') as any, requireRestaurantAccess as any, requireRole('MANAGER', 'SUPER_ADMIN') as any, menuController.getUploadSignature);

export default router;
