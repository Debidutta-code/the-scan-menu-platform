import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type PaymentProviderType = 'CASH' | 'RAZORPAY' | 'STRIPE' | 'SQUARE';
export type PaymentMode = 'PREPAID' | 'POSTPAID' | 'HYBRID';
export type TransactionStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

export interface ITransaction extends Document {
  restaurantId: Types.ObjectId;
  tableSessionId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  provider: PaymentProviderType;
  mode: PaymentMode;
  amount: number;
  currency: string;
  status: TransactionStatus;
  providerReferenceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableSessionId: { type: Schema.Types.ObjectId, ref: 'TableSession' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    provider: { type: String, enum: ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE'], required: true },
    mode: { type: String, enum: ['PREPAID', 'POSTPAID', 'HYBRID'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'INR' },
    status: { type: String, enum: ['PENDING', 'CAPTURED', 'FAILED', 'REFUNDED'], required: true, default: 'PENDING' },
    providerReferenceId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'transactions',
  }
);

transactionSchema.index({ restaurantId: 1, createdAt: -1 });
transactionSchema.index({ restaurantId: 1, tableSessionId: 1 });

export const Transaction = (mongoose.models.Transaction as any) || model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
