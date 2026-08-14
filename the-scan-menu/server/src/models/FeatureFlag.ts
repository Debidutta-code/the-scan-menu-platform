import { Schema, model, Document, Types } from 'mongoose';

export interface IFeatureFlag extends Document {
  restaurantId: Types.ObjectId;
  key: string;
  enabled: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    key: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: false },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

featureFlagSchema.index({ restaurantId: 1, key: 1 }, { unique: true });

export const FeatureFlag = model<IFeatureFlag>('FeatureFlag', featureFlagSchema);
