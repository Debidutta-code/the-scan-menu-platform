import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { categoryRepository } from '../repositories/category.repository';
import { menuItemRepository, customizationGroupRepository } from '../repositories/menuItem.repository';
import { CloudinaryService } from '../services/cloudinary.service';
import { restaurantStatsService } from '../services/restaurantStats.service';
import { inventoryService } from '../services/inventory.service';
import { cacheService } from '../utils/cacheService';
import { sendSuccess, sendError } from '../utils/response';
import mongoose from 'mongoose';

const cloudinaryService = new CloudinaryService();

export class MenuController {
  constructor() {
    this.listCategories = this.listCategories.bind(this);
    this.createCategory = this.createCategory.bind(this);
    this.editCategory = this.editCategory.bind(this);
    this.deleteCategory = this.deleteCategory.bind(this);
    this.reorderCategories = this.reorderCategories.bind(this);

    this.listMenuItems = this.listMenuItems.bind(this);
    this.getMenuItem = this.getMenuItem.bind(this);
    this.createMenuItem = this.createMenuItem.bind(this);
    this.editMenuItem = this.editMenuItem.bind(this);
    this.deleteMenuItem = this.deleteMenuItem.bind(this);
    this.toggleAvailability = this.toggleAvailability.bind(this);
    this.updateStock = this.updateStock.bind(this);
    this.bulkAvailability = this.bulkAvailability.bind(this);
    this.reorderMenuItems = this.reorderMenuItems.bind(this);

    this.listCustomizationGroups = this.listCustomizationGroups.bind(this);
    this.createCustomizationGroup = this.createCustomizationGroup.bind(this);
    this.editCustomizationGroup = this.editCustomizationGroup.bind(this);
    this.deleteCustomizationGroup = this.deleteCustomizationGroup.bind(this);

    this.getUploadSignature = this.getUploadSignature.bind(this);
  }

  // ==========================================
  // CATEGORIES
  // ==========================================

  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const categories = await categoryRepository.findByRestaurantId(restaurantId);

      sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { name, description, imageUrl, sortOrder } = req.body;

      if (!name) {
        sendError(res, 'BAD_REQUEST', 'Category name is required', null, 400);
        return;
      }

      let finalSortOrder = sortOrder;
      if (finalSortOrder === undefined) {
        // Auto-increment sortOrder: find max
        const lastCategory = await categoryRepository.findMaxSortOrder(restaurantId);
        finalSortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;
      }

      const category = await categoryRepository.create({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        name: name.trim(),
        description: description?.trim(),
        imageUrl: imageUrl?.trim(),
        sortOrder: finalSortOrder,
        isActive: true,
      });

      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async editCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, categoryId } = req.params;
      const updateData = { ...req.body };

      // Ensure manager doesn't modify restaurantId
      delete updateData.restaurantId;

      const category = await categoryRepository.updateByIdAndRestaurant(categoryId, restaurantId, updateData);

      if (!category) {
        sendError(res, 'CATEGORY_NOT_FOUND', 'Category not found', null, 404);
        return;
      }

      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, categoryId } = req.params;

      const category = await categoryRepository.findByIdAndRestaurant(categoryId, restaurantId);

      if (!category) {
        sendError(res, 'CATEGORY_NOT_FOUND', 'Category not found', null, 404);
        return;
      }

      const itemCount = await menuItemRepository.countByRestaurantAndCategory(restaurantId, category._id);

      if (itemCount > 0) {
        sendError(
          res,
          'CONFLICT',
          `Cannot delete category. There are ${itemCount} menu items inside this category. Please delete or move them first.`,
          null,
          409
        );
        return;
      }

      await categoryRepository.deleteById(categoryId);
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, {}, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async reorderCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const categoryOrder = req.body.categoryOrder || req.body.categoryIds;

      if (!Array.isArray(categoryOrder)) {
        sendError(res, 'BAD_REQUEST', 'categoryOrder or categoryIds must be an array of category IDs', null, 400);
        return;
      }

      await categoryRepository.bulkUpdateSortOrder(restaurantId, categoryOrder);
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, {}, 'Categories reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // MENU ITEMS
  // ==========================================

  async listMenuItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { categoryId, isDraft } = req.query;

      const query: Record<string, any> = {};

      if (categoryId) {
        query.categoryId = new mongoose.Types.ObjectId(categoryId as string);
      }

      if (isDraft !== undefined) {
        query.isDraft = isDraft === 'true';
      }

      const items = await menuItemRepository.findByRestaurantId(restaurantId, query);
      sendSuccess(res, items, 'Menu items retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, itemId } = req.params;
      const item = await menuItemRepository.findByIdAndRestaurant(itemId, restaurantId);

      if (!item) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      sendSuccess(res, item, 'Menu item retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const {
        categoryId,
        name,
        description,
        pricingType,
        price,
        variants,
        imageUrl,
        isVegetarian,
        isSpicy,
        isChefsSpecial,
        prepTimeMinutes,
        sortOrder,
        addOns,
        attachedAddOnGroupIds,
        isCombo,
        comboItems,
        trackStock,
        stockQuantity,
        lowStockThreshold,
        isAvailable,
        isDraft,
        completedStep,
        totalSteps,
      } = req.body;

      if (!categoryId || !name) {
        sendError(res, 'BAD_REQUEST', 'categoryId and name are required', null, 400);
        return;
      }

      // Compute final price
      let finalPrice = price;
      const isPortion = pricingType === 'PORTION' && Array.isArray(variants) && variants.length > 0;
      if (isPortion) {
        const defaultVar = variants.find((v: any) => v.isDefault) || variants[0];
        finalPrice = defaultVar ? defaultVar.price : (price || 0);
      } else if (!isDraft && (finalPrice === undefined || !Number.isInteger(finalPrice) || finalPrice < 0)) {
        sendError(res, 'BAD_REQUEST', 'Price must be a non-negative integer (paise/cents)', null, 400);
        return;
      }

      // Cross-category tenant leakage validation: Ensure category belongs to this restaurant
      const category = await categoryRepository.findByIdAndRestaurant(categoryId, restaurantId);

      if (!category) {
        sendError(
          res,
          'BAD_REQUEST',
          'Invalid categoryId. The specified category does not exist for this restaurant.',
          null,
          400
        );
        return;
      }

      let finalSortOrder = sortOrder;
      if (finalSortOrder === undefined) {
        // Auto-increment sortOrder inside this category
        const lastItem = await menuItemRepository.findMaxSortOrderInCategory(restaurantId, categoryId);
        finalSortOrder = lastItem ? lastItem.sortOrder + 1 : 0;
      }

      const menuItem = await menuItemRepository.create({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        categoryId: new mongoose.Types.ObjectId(categoryId),
        name: name.trim(),
        description: description?.trim(),
        pricingType: isPortion ? 'PORTION' : 'SINGLE',
        price: finalPrice || 0,
        variants: isPortion ? variants : undefined,
        imageUrl: imageUrl?.trim(),
        isAvailable: isAvailable !== undefined ? !!isAvailable : true,
        trackStock: !!trackStock,
        stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,
        lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
        isVegetarian: !!isVegetarian,
        isSpicy: !!isSpicy,
        isChefsSpecial: !!isChefsSpecial,
        prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes) : undefined,
        sortOrder: finalSortOrder,
        addOns,
        attachedAddOnGroupIds: Array.isArray(attachedAddOnGroupIds)
          ? attachedAddOnGroupIds.map((id: string) => new mongoose.Types.ObjectId(id))
          : undefined,
        isCombo: !!isCombo,
        comboItems: Array.isArray(comboItems) ? comboItems : undefined,
        isDraft: !!isDraft,
        completedStep: completedStep !== undefined ? Number(completedStep) : 5,
        totalSteps: totalSteps !== undefined ? Number(totalSteps) : 5,
      });

      await restaurantStatsService.incrementMenuItems(restaurantId, 1);
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, menuItem, 'Menu item created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async editMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, itemId } = req.params;
      const updateData = { ...req.body };

      // Prevent manager from modifying restaurantId
      delete updateData.restaurantId;

      const item = await menuItemRepository.findByIdAndRestaurant(itemId, restaurantId);

      if (!item) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      // Cross-category tenant validation if changing category
      if (updateData.categoryId && updateData.categoryId !== item.categoryId.toString()) {
        const category = await categoryRepository.findByIdAndRestaurant(updateData.categoryId, restaurantId);

        if (!category) {
          sendError(
            res,
            'BAD_REQUEST',
            'Invalid categoryId. The specified category does not exist for this restaurant.',
            null,
            400
          );
          return;
        }
        item.categoryId = new mongoose.Types.ObjectId(updateData.categoryId);
      }

      // Handle pricing type & variants
      if (updateData.pricingType !== undefined) {
        item.pricingType = updateData.pricingType;
      }
      if (updateData.variants !== undefined) {
        item.variants = updateData.variants;
        if (item.pricingType === 'PORTION' && Array.isArray(updateData.variants) && updateData.variants.length > 0) {
          const defaultVar = updateData.variants.find((v: any) => v.isDefault) || updateData.variants[0];
          item.price = defaultVar ? defaultVar.price : item.price;
        }
      }

      // Check price positive integer
      if (updateData.price !== undefined && item.pricingType !== 'PORTION') {
        if (!updateData.isDraft && (!Number.isInteger(updateData.price) || updateData.price < 0)) {
          sendError(res, 'BAD_REQUEST', 'Price must be a non-negative integer (paise/cents)', null, 400);
          return;
        }
        item.price = updateData.price;
      }

      if (updateData.name !== undefined) item.name = updateData.name.trim();
      if (updateData.description !== undefined) item.description = updateData.description.trim();
      if (updateData.imageUrl !== undefined) item.imageUrl = updateData.imageUrl.trim();
      if (updateData.isAvailable !== undefined) item.isAvailable = !!updateData.isAvailable;
      if (updateData.trackStock !== undefined) item.trackStock = !!updateData.trackStock;
      if (updateData.stockQuantity !== undefined) item.stockQuantity = updateData.stockQuantity;
      if (updateData.lowStockThreshold !== undefined) item.lowStockThreshold = updateData.lowStockThreshold;
      if (updateData.isVegetarian !== undefined) item.isVegetarian = !!updateData.isVegetarian;
      if (updateData.isSpicy !== undefined) item.isSpicy = !!updateData.isSpicy;
      if (updateData.isChefsSpecial !== undefined) item.isChefsSpecial = !!updateData.isChefsSpecial;
      if (updateData.prepTimeMinutes !== undefined) item.prepTimeMinutes = updateData.prepTimeMinutes ? parseInt(updateData.prepTimeMinutes) : undefined;
      if (updateData.sortOrder !== undefined) item.sortOrder = updateData.sortOrder;
      if (updateData.addOns !== undefined) item.addOns = updateData.addOns;
      if (updateData.attachedAddOnGroupIds !== undefined) {
        item.attachedAddOnGroupIds = Array.isArray(updateData.attachedAddOnGroupIds)
          ? updateData.attachedAddOnGroupIds.map((id: string) => new mongoose.Types.ObjectId(id))
          : [];
      }
      if (updateData.isCombo !== undefined) item.isCombo = !!updateData.isCombo;
      if (updateData.comboItems !== undefined) item.comboItems = updateData.comboItems;
      if (updateData.isDraft !== undefined) item.isDraft = !!updateData.isDraft;
      if (updateData.completedStep !== undefined) item.completedStep = Number(updateData.completedStep);
      if (updateData.totalSteps !== undefined) item.totalSteps = Number(updateData.totalSteps);

      await menuItemRepository.save(item);
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, item, 'Menu item updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, itemId } = req.params;

      const item = await menuItemRepository.findOneAndDelete(itemId, restaurantId);

      if (!item) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      await restaurantStatsService.incrementMenuItems(restaurantId, -1);
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);

      sendSuccess(res, {}, 'Menu item deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async toggleAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, itemId } = req.params;
      const { isAvailable } = req.body || {};

      const currentItem = await menuItemRepository.findByIdAndRestaurant(itemId, restaurantId);

      if (!currentItem) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      const targetState = isAvailable !== undefined ? !!isAvailable : !currentItem.isAvailable;

      const actorType = req.user?.role === 'STAFF' ? 'STAFF' : 'MANAGER';

      const updatedItem = await inventoryService.toggleItemAvailability(
        restaurantId,
        itemId,
        targetState,
        { type: actorType, id: req.user?.id }
      );

      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, updatedItem, 'Menu item availability toggled successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, itemId } = req.params;
      const { trackStock, stockQuantity, lowStockThreshold, isAvailable } = req.body;

      const actorType = req.user?.role === 'STAFF' ? 'STAFF' : 'MANAGER';

      const updatedItem = await inventoryService.updateItemStock(
        restaurantId,
        itemId,
        { trackStock, stockQuantity, lowStockThreshold, isAvailable },
        { type: actorType, id: req.user?.id }
      );

      if (!updatedItem) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      sendSuccess(res, updatedItem, 'Menu item stock updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async bulkAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { itemIds, isAvailable } = req.body;

      if (!Array.isArray(itemIds) || isAvailable === undefined) {
        sendError(res, 'BAD_REQUEST', 'itemIds (array) and isAvailable (boolean) are required', null, 400);
        return;
      }

      const objectIds = itemIds.map((id: string) => new mongoose.Types.ObjectId(id));

      await menuItemRepository.bulkUpdateAvailability(objectIds, restaurantId, !!isAvailable);

      sendSuccess(res, {}, 'Bulk availability updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async reorderMenuItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { itemIds, categoryId } = req.body;

      if (!Array.isArray(itemIds) || !categoryId) {
        sendError(res, 'BAD_REQUEST', 'itemIds (array) and categoryId are required', null, 400);
        return;
      }

      await menuItemRepository.bulkUpdateSortOrder(restaurantId, categoryId, itemIds);
      sendSuccess(res, {}, 'Menu items reordered successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CUSTOMIZATION & ADD-ON GROUPS
  // ==========================================

  async listCustomizationGroups(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { type } = req.query;

      const filter: any = {};

      if (type && (type === 'VARIANT' || type === 'ADDON')) {
        filter.type = type;
      }

      const groups = await customizationGroupRepository.findByRestaurantId(restaurantId, filter);
      sendSuccess(res, groups, 'Customization groups retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createCustomizationGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { name, type, selectionType, minSelections, maxSelections, isRequired, description, options, categoryIds, isGlobal } = req.body;

      if (!name || !type || !Array.isArray(options) || options.length === 0) {
        sendError(res, 'BAD_REQUEST', 'name, type, and at least one option are required', null, 400);
        return;
      }

      const group = await customizationGroupRepository.create({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        name: name.trim(),
        type,
        selectionType: selectionType || 'MULTIPLE',
        minSelections: Number(minSelections) || 0,
        maxSelections: Number(maxSelections) || 0,
        isRequired: !!isRequired,
        description: description?.trim(),
        options: options.map((opt: any) => ({
          name: opt.name.trim(),
          priceDelta: opt.priceDelta ? Math.max(0, parseInt(opt.priceDelta)) : 0,
          price: opt.price ? Math.max(0, parseInt(opt.price)) : 0,
        })),
        categoryIds: Array.isArray(categoryIds)
          ? categoryIds.map((cid: string) => new mongoose.Types.ObjectId(cid))
          : [],
        isGlobal: !!isGlobal,
      });

      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, group, 'Customization group created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async editCustomizationGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, id } = req.params;
      const { name, type, selectionType, minSelections, maxSelections, isRequired, description, options, categoryIds, isGlobal } = req.body;

      const group = await customizationGroupRepository.findByIdAndRestaurant(id, restaurantId);

      if (!group) {
        sendError(res, 'NOT_FOUND', 'Customization group not found', null, 404);
        return;
      }

      if (name !== undefined) group.name = name.trim();
      if (type !== undefined) group.type = type;
      if (selectionType !== undefined) group.selectionType = selectionType;
      if (minSelections !== undefined) group.minSelections = Number(minSelections) || 0;
      if (maxSelections !== undefined) group.maxSelections = Number(maxSelections) || 0;
      if (isRequired !== undefined) group.isRequired = !!isRequired;
      if (description !== undefined) group.description = description.trim();
      if (Array.isArray(options)) {
        group.options = options.map((opt: any) => ({
          name: opt.name.trim(),
          priceDelta: opt.priceDelta ? Math.max(0, parseInt(opt.priceDelta)) : 0,
          price: opt.price ? Math.max(0, parseInt(opt.price)) : 0,
        }));
      }
      if (Array.isArray(categoryIds)) {
        group.categoryIds = categoryIds.map((cid: string) => new mongoose.Types.ObjectId(cid));
      }
      if (isGlobal !== undefined) group.isGlobal = !!isGlobal;

      await customizationGroupRepository.save(group);
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, group, 'Customization group updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomizationGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, id } = req.params;

      const group = await customizationGroupRepository.archiveByIdAndRestaurant(id, restaurantId);

      if (!group) {
        sendError(res, 'NOT_FOUND', 'Customization group not found', null, 404);
        return;
      }

      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, {}, 'Customization group archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CLOUDINARY DIRECT UPLOADS
  // ==========================================

  async getUploadSignature(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const signatureDetails = cloudinaryService.generateUploadSignature(restaurantId);

      sendSuccess(res, signatureDetails, 'Upload signature generated successfully');
    } catch (error) {
      next(error);
    }
  }
}
export default MenuController;
