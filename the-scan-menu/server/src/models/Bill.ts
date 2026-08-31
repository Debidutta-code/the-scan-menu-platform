import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { IOrderTaxBreakdown } from './Order';

export type BillStatus = 'PENDING' | 'SUPERSEDED' | 'SETTLED' | 'CANCELLED';

export interface IBill extends Document {
  restaurantId: Types.ObjectId;
  diningSessionId: Types.ObjectId;
  tableId: Types.ObjectId;
  billNumber: string; // e.g. "INV-2026-0042"
  version: number; // 1, 2, 3...
  grossAmount: number; // In paise/cents
  taxAmount: number; // In paise/cents
  taxBreakdown: IOrderTaxBreakdown[];
  discountAmount: number; // In paise/cents
  discountReason?: string;
  serviceCharge: number; // In paise/cents
  roundOff?: number; // In paise/cents (+/-)
  netAmount: number; // In paise/cents
  paidAmount: number; // In paise/cents
  balanceDue: number; // In paise/cents
  status: BillStatus;
  generatedBy?: Types.ObjectId; // Staff User ID or null for system
  generatedAt: Date;
  settledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    diningSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    billNumber: { type: String, required: true, trim: true },
    version: { type: Number, required: true, default: 1 },
    grossAmount: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, required: true, default: 0 },
    taxBreakdown: [
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
    ],
    discountAmount: { type: Number, required: true, default: 0 },
    discountReason: { type: String, trim: true },
    serviceCharge: { type: Number, required: true, default: 0 },
    roundOff: { type: Number, required: true, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    paidAmount: { type: Number, required: true, default: 0 },
    balanceDue: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'SUPERSEDED', 'SETTLED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, required: true, default: Date.now },
    settledAt: { type: Date },
    cancellationReason: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'bills',
  }
);

// Indexes
billSchema.index({ diningSessionId: 1, version: 1 }, { unique: true });
billSchema.index({ restaurantId: 1, billNumber: 1 }, { unique: true });
billSchema.index({ diningSessionId: 1, status: 1 });

export const Bill =
  (mongoose.models.Bill as mongoose.Model<IBill>) ||
  model<IBill>('Bill', billSchema);

export default Bill;
