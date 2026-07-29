import { Schema, model, Document } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  key: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  name: string;
  description: string;
  includedFeatureKeys: string[];
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    key: {
      type: String,
      required: true,
      enum: ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
      unique: true
    },
    name: { type: String, required: true },
    description: { type: String },
    includedFeatureKeys: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const SubscriptionPlan = model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
export default SubscriptionPlan;
