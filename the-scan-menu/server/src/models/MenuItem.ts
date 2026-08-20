import { Schema, model, Document, Types } from 'mongoose';

export interface IAddOn {
  name: string;
  priceDelta: number; // in cents/paise
}

export interface IVariant {
  name: string; // e.g. "Half", "Full", "Small", "Medium", "Large"
  price: number; // in cents/paise
  isDefault?: boolean;
}

export interface IComboItem {
  menuItemId?: Types.ObjectId;
  name: string;
  categoryName?: string;
  quantity: number;
  imageUrl?: string;
}

export interface IMenuItem extends Document {
  restaurantId: Types.ObjectId;
  categoryId: Types.ObjectId;
  name: string;
  description?: string;
  pricingType: 'SINGLE' | 'PORTION';
  price: number; // Stored as integer cents/paise (base price or default variant price)
  variants?: IVariant[];
  imageUrl?: string;
  isAvailable: boolean;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  isVegetarian: boolean;
  isSpicy: boolean;
  isChefsSpecial: boolean;
  prepTimeMinutes?: number;
  sortOrder: number;
  addOns?: IAddOn[];
  attachedAddOnGroupIds?: Types.ObjectId[];
  isCombo?: boolean;
  comboItems?: IComboItem[];
  externalIds?: Record<string, any>;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addOnSchema = new Schema<IAddOn>(
  {
    name: { type: String, required: true, trim: true },
    priceDelta: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const variantSchema = new Schema<IVariant>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const comboItemSchema = new Schema<IComboItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem' },
    name: { type: String, required: true, trim: true },
    categoryName: { type: String, trim: true },
    quantity: { type: Number, required: true, default: 1 },
    imageUrl: { type: String, trim: true },
  },
  { _id: false }
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    pricingType: { type: String, enum: ['SINGLE', 'PORTION'], default: 'SINGLE' },
    price: { type: Number, required: true }, // positive integer validated via Zod
    variants: [variantSchema],
    imageUrl: { type: String, trim: true },
    isAvailable: { type: Boolean, required: true, default: true },
    trackStock: { type: Boolean, required: true, default: false },
    stockQuantity: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, required: true, default: 5 },
    isVegetarian: { type: Boolean, required: true, default: false },
    isSpicy: { type: Boolean, required: true, default: false },
    isChefsSpecial: { type: Boolean, required: true, default: false },
    prepTimeMinutes: { type: Number },
    sortOrder: { type: Number, required: true, default: 0 },
    addOns: [addOnSchema],
    attachedAddOnGroupIds: [{ type: Schema.Types.ObjectId, ref: 'CustomizationGroup' }],
    isCombo: { type: Boolean, default: false },
    comboItems: [comboItemSchema],
    externalIds: { type: Schema.Types.Mixed, default: {} },
    isArchived: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
    collection: 'menu_items',
  }
);

// Indexes:
// 1. Optimize querying items by category inside a restaurant (Manager menu rendering)
menuItemSchema.index({ restaurantId: 1, categoryId: 1 });
// 2. Critical for public customer menu filtration (always searches active, available items)
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });
// 3. Stock tracking index for fast availability & stock queries
menuItemSchema.index({ restaurantId: 1, isAvailable: 1, trackStock: 1 });

export const MenuItem = model<IMenuItem>('MenuItem', menuItemSchema);
export default MenuItem;
