import { Schema, model, Document, Types } from 'mongoose';

export interface IDeviceToken extends Document {
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceModel?: string;
  appVersion?: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android',
    },
    deviceModel: {
      type: String,
      trim: true,
    },
    appVersion: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'device_tokens',
  }
);

// Compound index for querying active devices for a restaurant
deviceTokenSchema.index({ restaurantId: 1, isActive: 1 });
deviceTokenSchema.index({ userId: 1, isActive: 1 });

export const DeviceToken = model<IDeviceToken>('DeviceToken', deviceTokenSchema);
export default DeviceToken;
