import mongoose, { Schema, model, Document } from 'mongoose';

export interface IPlatformSettingsLoyalty {
  mode: 'GLOBAL' | 'OUTLET_WISE';
  enabled: boolean;
  earningMode: 'PERCENTAGE' | 'SPEND_RATIO' | 'FIXED_PER_ORDER';
  earnPercentage: number;
  spendRatioPaise: number;
  fixedPointsPerOrder: number;
  validityDays: number;
  pointValuePaise: number;
  maxRedemptionPercentPerOrder: number;
  minPointsToRedeem: number;
}

export interface IPlatformSettings extends Document {
  loyalty: IPlatformSettingsLoyalty;
  createdAt: Date;
  updatedAt: Date;
}

const platformSettingsSchema = new Schema<IPlatformSettings>(
  {
    loyalty: {
      mode: {
        type: String,
        enum: ['GLOBAL', 'OUTLET_WISE'],
        default: 'GLOBAL',
      },
      enabled: { type: Boolean, default: true },
      earningMode: {
        type: String,
        enum: ['PERCENTAGE', 'SPEND_RATIO', 'FIXED_PER_ORDER'],
        default: 'PERCENTAGE',
      },
      earnPercentage: { type: Number, default: 50 }, // 50% points on spend
      spendRatioPaise: { type: Number, default: 1000 }, // 1 pt per ₹10
      fixedPointsPerOrder: { type: Number, default: 50 },
      validityDays: { type: Number, default: 7 }, // 7 days validity
      pointValuePaise: { type: Number, default: 50 }, // 1 pt = ₹0.50
      maxRedemptionPercentPerOrder: { type: Number, default: 50 }, // Max 50% of bill
      minPointsToRedeem: { type: Number, default: 50 },
    },
  },
  {
    timestamps: true,
    collection: 'platform_settings',
  }
);

export const PlatformSettings =
  (mongoose.models.PlatformSettings as mongoose.Model<IPlatformSettings>) ||
  model<IPlatformSettings>('PlatformSettings', platformSettingsSchema);

export default PlatformSettings;
