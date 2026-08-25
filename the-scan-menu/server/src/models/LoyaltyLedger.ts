import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type LoyaltyTransactionType = 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';

export interface ILoyaltyLedger extends Document {
  restaurantId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderId?: Types.ObjectId;
  type: LoyaltyTransactionType;
  points: number; // positive for EARN/ADJUST(+), negative for REDEEM/EXPIRE
  remainingPoints?: number; // unredeemed points for FIFO tracking
  rupeeValuePaise?: number; // Equivalent cash value in paise
  balanceAfter: number;
  expiresAt?: Date; // Point batch expiration timestamp
  reason?: string;
  actorStaffId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyLedgerSchema = new Schema<ILoyaltyLedger>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    type: {
      type: String,
      enum: ['EARN', 'REDEEM', 'ADJUST', 'EXPIRE'],
      required: true,
    },
    points: { type: Number, required: true },
    remainingPoints: { type: Number, default: 0 },
    rupeeValuePaise: { type: Number, default: 0 },
    balanceAfter: { type: Number, required: true },
    expiresAt: { type: Date, index: true },
    reason: { type: String, trim: true },
    actorStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'loyalty_ledgers',
  }
);

loyaltyLedgerSchema.index({ customerId: 1, createdAt: -1 });

export const LoyaltyLedger =
  (mongoose.models.LoyaltyLedger as mongoose.Model<ILoyaltyLedger>) ||
  model<ILoyaltyLedger>('LoyaltyLedger', loyaltyLedgerSchema);

export default LoyaltyLedger;
