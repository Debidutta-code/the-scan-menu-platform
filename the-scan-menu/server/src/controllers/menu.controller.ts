import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Category } from '../models/Category';
import { MenuItem } from '../models/MenuItem';
import { CustomizationGroup } from '../models/CustomizationGroup';
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
      const categories = await Category.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      }).sort({ sortOrder: 1 });

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
        const lastCategory = await Category.findOne({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
        }).sort({ sortOrder: -1 });
        finalSortOrder = lastCategory ? lastCategory.sortOrder + 1 : 0;
      }

      const category = new Category({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        name: name.trim(),
        description: description?.trim(),
        imageUrl: imageUrl?.trim(),
        sortOrder: finalSortOrder,
        isActive: true,
      });

      await category.save();
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

      const category = await Category.findOneAndUpdate(
        { _id: categoryId, restaurantId: new mongoose.Types.ObjectId(restaurantId) },
        updateData,
        { new: true }
      );

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

      const category = await Category.findOne({
        _id: categoryId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!category) {
        sendError(res, 'CATEGORY_NOT_FOUND', 'Category not found', null, 404);
        return;
      }

      const itemCount = await MenuItem.countDocuments({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        categoryId: category._id,
      });

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

      await Category.findByIdAndDelete(categoryId);
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

      const bulkOps = categoryOrder.map((id: string, index: number) => ({
        updateOne: {
          filter: {
            _id: new mongoose.Types.ObjectId(id),
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
          },
          update: { $set: { sortOrder: index } },
        },
      }));

      await Category.bulkWrite(bulkOps);
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
      const { categoryId } = req.query;

      const query: Record<string, any> = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      };

      if (categoryId) {
        query.categoryId = new mongoose.Types.ObjectId(categoryId as string);
      }

      const items = await MenuItem.find(query)
        .populate('categoryId', 'name sortOrder')
        .sort({ sortOrder: 1 });
      sendSuccess(res, items, 'Menu items retrieved successfully');
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
      } else if (finalPrice === undefined || !Number.isInteger(finalPrice) || finalPrice < 0) {
        sendError(res, 'BAD_REQUEST', 'Price must be a non-negative integer (paise/cents)', null, 400);
        return;
      }

      // Cross-category tenant leakage validation: Ensure category belongs to this restaurant
      const category = await Category.findOne({
        _id: categoryId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

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
        const lastItem = await MenuItem.findOne({
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          categoryId: new mongoose.Types.ObjectId(categoryId),
        }).sort({ sortOrder: -1 });
        finalSortOrder = lastItem ? lastItem.sortOrder + 1 : 0;
      }

      const menuItem = new MenuItem({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        categoryId: new mongoose.Types.ObjectId(categoryId),
        name: name.trim(),
        description: description?.trim(),
        pricingType: isPortion ? 'PORTION' : 'SINGLE',
        price: finalPrice,
        variants: isPortion ? variants : undefined,
        imageUrl: imageUrl?.trim(),
        isAvailable: isAvailable !== undefined ? !!isAvailable : true,
        trackStock: !!trackStock,
        stockQuantity: stockQuantity !== undefined ? stockQuantity : 0,
        lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
        isVegetarian: !!isVegetarian,
        isSpicy: !!isSpicy,
        prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes) : undefined,
        sortOrder: finalSortOrder,
        addOns,
        attachedAddOnGroupIds: Array.isArray(attachedAddOnGroupIds)
          ? attachedAddOnGroupIds.map((id: string) => new mongoose.Types.ObjectId(id))
          : undefined,
        isCombo: !!isCombo,
        comboItems: Array.isArray(comboItems) ? comboItems : undefined,
      });

      await menuItem.save();
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

      const item = await MenuItem.findOne({
        _id: itemId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

      if (!item) {
        sendError(res, 'MENU_ITEM_NOT_FOUND', 'Menu item not found', null, 404);
        return;
      }

      // Cross-category tenant validation if changing category
      if (updateData.categoryId && updateData.categoryId !== item.categoryId.toString()) {
        const category = await Category.findOne({
          _id: updateData.categoryId,
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
        });

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
        if (!Number.isInteger(updateData.price) || updateData.price < 0) {
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
      if (updateData.isSpicy !== undefined) item.isSpicy = !!updateData.isSpicy;
      if (updateData.prepTimeMinutes !== undefined) {
        item.prepTimeMinutes = updateData.prepTimeMinutes ? parseInt(updateData.prepTimeMinutes) : undefined;
      }
      if (updateData.sortOrder !== undefined) item.sortOrder = updateData.sortOrder;
      if (updateData.addOns !== undefined) item.addOns = updateData.addOns;

      await item.save();
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, item, 'Menu item updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, itemId } = req.params;

      const item = await MenuItem.findOneAndDelete({
        _id: itemId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

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

      const currentItem = await MenuItem.findOne({
        _id: itemId,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
      });

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

      await MenuItem.updateMany(
        {
          _id: { $in: objectIds },
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
        },
        { isAvailable: !!isAvailable }
      );

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

      const bulkOps = itemIds.map((id: string, index: number) => ({
        updateOne: {
          filter: {
            _id: new mongoose.Types.ObjectId(id),
            categoryId: new mongoose.Types.ObjectId(categoryId),
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
          },
          update: { sortOrder: index },
        },
      }));

      await MenuItem.bulkWrite(bulkOps);
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

      const filter: any = {
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isArchived: false,
      };

      if (type && (type === 'VARIANT' || type === 'ADDON')) {
        filter.type = type;
      }

      const groups = await CustomizationGroup.find(filter).sort({ createdAt: -1 });
      sendSuccess(res, groups, 'Customization groups retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createCustomizationGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId } = req.params;
      const { name, type, description, options, categoryIds, isGlobal } = req.body;

      if (!name || !type || !Array.isArray(options) || options.length === 0) {
        sendError(res, 'BAD_REQUEST', 'name, type, and at least one option are required', null, 400);
        return;
      }

      const group = new CustomizationGroup({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        name: name.trim(),
        type,
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

      await group.save();
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, group, 'Customization group created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async editCustomizationGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, id } = req.params;
      const { name, type, description, options, categoryIds, isGlobal } = req.body;

      const group = await CustomizationGroup.findOne({
        _id: id,
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        isArchived: false,
      });

      if (!group) {
        sendError(res, 'NOT_FOUND', 'Customization group not found', null, 404);
        return;
      }

      if (name !== undefined) group.name = name.trim();
      if (type !== undefined) group.type = type;
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

      await group.save();
      cacheService.invalidatePattern(`public_menu_${restaurantId}`);
      sendSuccess(res, group, 'Customization group updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteCustomizationGroup(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, id } = req.params;

      const group = await CustomizationGroup.findOneAndUpdate(
        {
          _id: id,
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
        },
        { isArchived: true },
        { new: true }
      );

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
