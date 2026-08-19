import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomizationOption {
  name: string;
  priceDelta?: number; // for ADDON type (in cents/paise)
  price?: number; // for VARIANT type (in cents/paise)
}

export interface ICustomizationGroup extends Document {
  restaurantId: Types.ObjectId;
  name: string; // e.g. "Portion Sizes", "Extra Dips", "Dessert Add-ons"
  type: 'VARIANT' | 'ADDON';
  description?: string;
  options: ICustomizationOption[];
  categoryIds?: Types.ObjectId[]; // Categories this template is auto-linked to
  isGlobal: boolean; // if true, available across all categories
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customizationOptionSchema = new Schema<ICustomizationOption>(
  {
    name: { type: String, required: true, trim: true },
    priceDelta: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const customizationGroupSchema = new Schema<ICustomizationGroup>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['VARIANT', 'ADDON'], required: true, default: 'ADDON' },
    description: { type: String, trim: true },
    options: [customizationOptionSchema],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    isGlobal: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'customization_groups',
  }
);

customizationGroupSchema.index({ restaurantId: 1, type: 1 });
customizationGroupSchema.index({ restaurantId: 1, categoryIds: 1 });

export const CustomizationGroup = model<ICustomizationGroup>('CustomizationGroup', customizationGroupSchema);
export default CustomizationGroup;
