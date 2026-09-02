import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type PaymentProviderType = 'CASH' | 'RAZORPAY' | 'STRIPE' | 'SQUARE' | 'UPI' | 'CARD' | 'MANUAL';
export type PaymentMethodType = 'CASH' | 'UPI' | 'CARD' | 'NETBANKING' | 'OTHER';
export type PaymentMode = 'PREPAID' | 'POSTPAID' | 'HYBRID';
export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface IPayment extends Document {
  restaurantId: Types.ObjectId;
  diningSessionId?: Types.ObjectId;
  tableSessionId?: Types.ObjectId; // Alias for backward compatibility
  tableId?: Types.ObjectId;
  billId?: Types.ObjectId;
  checkoutAttemptId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  provider: PaymentProviderType;
  method: PaymentMethodType;
  mode: PaymentMode;
  amount: number; // in paise/cents
  currency: string;
  status: PaymentStatus;
  providerReferenceId?: string;
  idempotencyKey?: string;
  refundedAmount: number; // in paise/cents
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    diningSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession', index: true },
    tableSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession' },
    billId: { type: Schema.Types.ObjectId, ref: 'Bill', index: true },
    checkoutAttemptId: { type: Schema.Types.ObjectId, ref: 'CheckoutAttempt', index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    provider: {
      type: String,
      enum: ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE', 'UPI', 'CARD', 'MANUAL'],
      required: true,
    },
    method: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'NETBANKING', 'OTHER'],
      default: 'CASH',
    },
    mode: {
      type: String,
      enum: ['PREPAID', 'POSTPAID', 'HYBRID'],
      default: 'POSTPAID',
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    status: {
      type: String,
      enum: ['PENDING', 'CAPTURED', 'FAILED', 'REFUNDED'],
      required: true,
      default: 'PENDING',
      index: true,
    },
    providerReferenceId: { type: String, trim: true },
    idempotencyKey: { type: String, trim: true },
    refundedAmount: { type: Number, required: true, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

paymentSchema.index({ restaurantId: 1, createdAt: -1 });
paymentSchema.index({ diningSessionId: 1, status: 1 });
paymentSchema.index({ providerReferenceId: 1 }, { sparse: true });
paymentSchema.index({ idempotencyKey: 1 }, { sparse: true });

export const Payment =
  (mongoose.models.Payment as mongoose.Model<IPayment>) ||
  model<IPayment>('Payment', paymentSchema);

// Backwards compatibility alias
export const Transaction = Payment;
export type ITransaction = IPayment;
export default Payment;
