import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type ShiftStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'CASH_IN' | 'CASH_OUT';

export interface IPettyCashEntry {
  type: CashMovementType;
  amount: number; // in paise/cents
  category: 'FLOAT_TOPUP' | 'VENDOR_PAYOUT' | 'SUPPLIES' | 'REFUND' | 'STAFF_ADVANCE' | 'OTHER';
  reason: string;
  staffId?: Types.ObjectId;
  createdAt: Date;
}

export interface IShift extends Document {
  restaurantId: Types.ObjectId;
  staffId: Types.ObjectId;
  shiftNumber: number;
  status: ShiftStatus;
  openedAt: Date;
  closedAt?: Date;
  openingFloat: number; // in paise/cents
  cashIn: number; // total petty cash additions
  cashOut: number; // total petty cash expenses
  pettyCashEntries: IPettyCashEntry[];
  cashSales: number; // in paise/cents
  cardSales: number; // in paise/cents
  upiSales: number; // in paise/cents
  totalSales: number; // in paise/cents
  orderCount: number;
  expectedCashInDrawer: number; // openingFloat + cashSales + cashIn - cashOut
  actualCashCounted?: number; // in paise/cents
  discrepancyAmount?: number; // actualCashCounted - expectedCashInDrawer
  closingNotes?: string;
  closedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pettyCashEntrySchema = new Schema<IPettyCashEntry>(
  {
    type: { type: String, enum: ['CASH_IN', 'CASH_OUT'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: ['FLOAT_TOPUP', 'VENDOR_PAYOUT', 'SUPPLIES', 'REFUND', 'STAFF_ADVANCE', 'OTHER'],
      default: 'OTHER',
    },
    reason: { type: String, required: true, trim: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const shiftSchema = new Schema<IShift>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shiftNumber: { type: Number, required: true, default: 1 },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN', index: true },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },
    openingFloat: { type: Number, required: true, default: 0 },
    cashIn: { type: Number, required: true, default: 0 },
    cashOut: { type: Number, required: true, default: 0 },
    pettyCashEntries: [pettyCashEntrySchema],
    cashSales: { type: Number, required: true, default: 0 },
    cardSales: { type: Number, required: true, default: 0 },
    upiSales: { type: Number, required: true, default: 0 },
    totalSales: { type: Number, required: true, default: 0 },
    orderCount: { type: Number, required: true, default: 0 },
    expectedCashInDrawer: { type: Number, required: true, default: 0 },
    actualCashCounted: { type: Number },
    discrepancyAmount: { type: Number },
    closingNotes: { type: String, trim: true },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'shifts',
  }
);

shiftSchema.index({ restaurantId: 1, status: 1 });
shiftSchema.index({ restaurantId: 1, createdAt: -1 });

export const Shift = (mongoose.models.Shift as mongoose.Model<IShift>) || model<IShift>('Shift', shiftSchema);
export default Shift;
