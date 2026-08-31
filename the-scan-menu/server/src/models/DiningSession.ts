import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { IOrderTaxBreakdown } from './Order';

export type DiningSessionStatus = 'ACTIVE' | 'BILL_REQUESTED' | 'SETTLED' | 'CLOSED' | 'ABANDONED';
export type DiningPaymentMode = 'PREPAID' | 'POSTPAID';

export interface IDiningSession extends Document {
  restaurantId: Types.ObjectId;
  tableId: Types.ObjectId;
  linkedTableIds?: Types.ObjectId[];
  sessionCode: string;
  joinPin: string;
  status: DiningSessionStatus;
  paymentMode: DiningPaymentMode;
  roundCount: number;
  guestCount: number;
  subtotal: number; // In paise/cents
  tax: number; // In paise/cents
  taxBreakdown: IOrderTaxBreakdown[];
  discount: number; // In paise/cents
  discountReason?: string;
  serviceCharge: number; // In paise/cents
  roundOff?: number; // In paise/cents (+/-)
  total: number; // (subtotal + tax + serviceCharge - discount + roundOff) in paise/cents
  paidAmount: number; // In paise/cents
  balanceDue: number; // (total - paidAmount) in paise/cents
  openedAt: Date;
  lastActivityAt: Date;
  closedAt?: Date;
  abandonedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taxBreakdownSchema = new Schema(
  {
    name: { type: String, required: true },
    percentage: { type: Number, required: true },
    amount: { type: Number, required: true },
    subTaxes: [
      {
        name: { type: String, required: true },
        percentage: { type: Number, required: true },
        amount: { type: Number, required: true },
      },
    ],
  },
  { _id: false }
);

const diningSessionSchema = new Schema<IDiningSession>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true, index: true },
    linkedTableIds: [{ type: Schema.Types.ObjectId, ref: 'Table' }],
    sessionCode: { type: String, required: true, trim: true },
    joinPin: { type: String, required: true, default: () => Math.floor(1000 + Math.random() * 9000).toString() },
    status: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'BILL_REQUESTED', 'SETTLED', 'CLOSED', 'ABANDONED'],
      default: 'ACTIVE',
      index: true,
    },
    paymentMode: {
      type: String,
      required: true,
      enum: ['PREPAID', 'POSTPAID'],
      default: 'POSTPAID',
    },
    roundCount: { type: Number, required: true, default: 0 },
    guestCount: { type: Number, required: true, default: 1 },
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 },
    taxBreakdown: [taxBreakdownSchema],
    discount: { type: Number, required: true, default: 0 },
    discountReason: { type: String, trim: true },
    serviceCharge: { type: Number, required: true, default: 0 },
    roundOff: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 },
    openedAt: { type: Date, required: true, default: Date.now },
    lastActivityAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },
    abandonedReason: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'dining_sessions',
  }
);

// Compound partial unique index: Guarantee at most ONE active/bill_requested session per table per restaurant
diningSessionSchema.index(
  { restaurantId: 1, tableId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['ACTIVE', 'BILL_REQUESTED'] } } }
);

diningSessionSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

export const DiningSession =
  (mongoose.models.DiningSession as mongoose.Model<IDiningSession>) ||
  model<IDiningSession>('DiningSession', diningSessionSchema);

// Backward-compatible alias for existing code referencing TableSession
export const TableSession = DiningSession;
export type ITableSession = IDiningSession;
export default DiningSession;
