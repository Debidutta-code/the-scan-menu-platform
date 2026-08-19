import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createMenuItemSchema = z.object({
  categoryId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
  name: z.string().trim().min(1, 'Menu item name is required'),
  description: z.string().trim().optional(),
  pricingType: z.enum(['SINGLE', 'PORTION']).default('SINGLE'),
  price: z.number().int().nonnegative('Price must be a non-negative integer (paise/cents)'),
  variants: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Variant size name is required'),
        price: z.number().int().nonnegative('Variant price must be non-negative'),
        isDefault: z.boolean().optional(),
      })
    )
    .optional(),
  imageUrl: z.string().trim().optional(),
  isAvailable: z.boolean().optional(),
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be non-negative').optional(),
  lowStockThreshold: z.number().int().nonnegative('Low stock threshold must be non-negative').optional(),
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  prepTimeMinutes: z.number().int().positive().optional(),
  addOns: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Add-on name is required'),
        priceDelta: z.number().int().nonnegative('Price delta must be a non-negative integer'),
      })
    )
    .optional(),
  attachedAddOnGroupIds: z.array(z.string()).optional(),
  isCombo: z.boolean().optional(),
  comboItems: z
    .array(
      z.object({
        menuItemId: z.string().optional(),
        name: z.string().trim().min(1, 'Combo item dish name is required'),
        categoryName: z.string().trim().optional(),
        quantity: z.number().int().positive().default(1),
        imageUrl: z.string().trim().optional(),
      })
    )
    .optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const updateStockSchema = z.object({
  trackStock: z.boolean().optional(),
  stockQuantity: z.number().int().nonnegative('Stock quantity must be a non-negative integer').optional(),
  lowStockThreshold: z.number().int().nonnegative('Low stock threshold must be a non-negative integer').optional(),
  isAvailable: z.boolean().optional(),
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean({ required_error: 'isAvailable boolean is required' }),
});

export const createCustomizationGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required'),
  type: z.enum(['VARIANT', 'ADDON'], { required_error: 'Type must be VARIANT or ADDON' }),
  description: z.string().trim().optional(),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Option name is required'),
        priceDelta: z.number().int().optional().default(0),
        price: z.number().int().optional().default(0),
      })
    )
    .min(1, 'At least one option is required'),
  categoryIds: z.array(z.string()).optional().default([]),
  isGlobal: z.boolean().optional().default(false),
});

export const updateCustomizationGroupSchema = createCustomizationGroupSchema.partial();


