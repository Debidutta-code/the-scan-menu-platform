import mongoose, { Schema, model, Document } from 'mongoose';

export type RestaurantStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED';

export interface IRestaurantSubscription {
  status: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  planKey: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  expiresAt: Date;
}

export interface IRestaurant extends Document {
  code: string;
  name: string;
  slug: string;
  status: RestaurantStatus;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  subscription?: IRestaurantSubscription;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'ARCHIVED'],
      default: 'TRIAL',
    },
    logoUrl: { type: String, trim: true },
    coverImageUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    subscription: {
      status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'TRIAL'], default: 'TRIAL' },
      planKey: { type: String, enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'], default: 'FREE' },
      expiresAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    },
  },
  {
    timestamps: true,
    collection: 'restaurants',
  }
);

export const Restaurant = (mongoose.models.Restaurant as any) || model<IRestaurant>('Restaurant', restaurantSchema);
export default Restaurant;
