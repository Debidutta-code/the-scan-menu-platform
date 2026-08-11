import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  totalOrdersCount: number;
  totalSpent: number;
  lastOrderAt?: Date;
  lastSeenAt?: Date;
  isBlocked: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    totalOrdersCount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalSpent: {
      type: Number,
      required: true,
      default: 0,
    },
    lastOrderAt: {
      type: Date,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    isBlocked: {
      type: Boolean,
      required: true,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'customers',
  }
);

// Compound index for fast lookup per restaurant
customerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });
customerSchema.index({ restaurantId: 1, createdAt: -1 });

export const Customer = (mongoose.models.Customer as mongoose.Model<ICustomer>) || model<ICustomer>('Customer', customerSchema);
export default Customer;
