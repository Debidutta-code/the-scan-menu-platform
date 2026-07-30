import { Schema, model, Document, Types } from 'mongoose';

export interface IRestaurantOnboarding extends Document {
  restaurantId: Types.ObjectId;
  restaurantCreated: boolean;
  managerCreated: boolean;
  tablesCreated: boolean;
  menuImported: boolean;
  paymentsConfigured: boolean;
  subscriptionAssigned: boolean;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantOnboardingSchema = new Schema<IRestaurantOnboarding>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    restaurantCreated: { type: Boolean, required: true, default: false },
    managerCreated: { type: Boolean, required: true, default: false },
    tablesCreated: { type: Boolean, required: true, default: false },
    menuImported: { type: Boolean, required: true, default: false },
    paymentsConfigured: { type: Boolean, required: true, default: false },
    subscriptionAssigned: { type: Boolean, required: true, default: false },
    completed: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
    collection: 'restaurant_onboarding',
  }
);

export const RestaurantOnboarding = model<IRestaurantOnboarding>('RestaurantOnboarding', restaurantOnboardingSchema);
export default RestaurantOnboarding;
