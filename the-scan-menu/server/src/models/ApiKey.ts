import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type ApiKeyScope = 'menu:read' | 'orders:read' | 'orders:write' | 'webhooks:manage';

export interface IApiKey extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  keyPrefix: string; // e.g. "tsm_live_a1b2c3d4"
  keyHash: string;   // SHA-256 hash of full raw key
  scopes: ApiKeyScope[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true },
    keyPrefix: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    scopes: [{ type: String, required: true }],
    expiresAt: { type: Date },
    lastUsedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'api_keys',
  }
);

apiKeySchema.index({ restaurantId: 1, isActive: 1 });

export const ApiKey = (mongoose.models.ApiKey as any) || model<IApiKey>('ApiKey', apiKeySchema);
export default ApiKey;
