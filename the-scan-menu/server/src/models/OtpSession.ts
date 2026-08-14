import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IOtpSession extends Document {
  restaurantId: Types.ObjectId;
  phone: string;
  otpHash: string;
  attempts: number;
  maxAttempts: number;
  resendAvailableAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const otpSessionSchema = new Schema<IOtpSession>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      default: 5,
    },
    resendAvailableAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 60 * 1000), // 60s cooldown
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes TTL
    },
    isUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'otp_sessions',
  }
);

// Compound index for active session lookup
otpSessionSchema.index({ restaurantId: 1, phone: 1, isUsed: 1 });
// Automatic cleanup after expiration via MongoDB TTL index
otpSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpSession =
  (mongoose.models.OtpSession as mongoose.Model<IOtpSession>) ||
  model<IOtpSession>('OtpSession', otpSessionSchema);

export default OtpSession;
