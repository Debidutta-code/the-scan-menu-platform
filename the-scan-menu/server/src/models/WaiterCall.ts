import { Schema, model, Document, Types } from 'mongoose';

export type WaiterCallStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED' | 'CANCELLED';

export interface IStaffAttribution {
  userId?: Types.ObjectId;
  name: string;
  role: string;
}

export interface IWaiterCall extends Document {
  restaurantId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumberSnapshot: string;
  status: WaiterCallStatus;
  requestType: 'CALL_WAITER' | 'REQUEST_BILL' | 'WATER' | 'TISSUE' | 'OTHER';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: IStaffAttribution;
  resolvedAt?: Date;
  resolvedBy?: IStaffAttribution;
}

const staffAttributionSchema = new Schema<IStaffAttribution>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: 'STAFF', trim: true },
  },
  { _id: false }
);

const waiterCallSchema = new Schema<IWaiterCall>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumberSnapshot: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
    },
    requestType: {
      type: String,
      required: true,
      enum: ['CALL_WAITER', 'REQUEST_BILL', 'WATER', 'TISSUE', 'OTHER'],
      default: 'CALL_WAITER',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes default expiry
    },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: staffAttributionSchema },
    resolvedAt: { type: Date },
    resolvedBy: { type: staffAttributionSchema },
  },
  {
    timestamps: true,
    collection: 'waiter_calls',
  }
);

// Index optimizes lookup of active waiter calls per restaurant
waiterCallSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
waiterCallSchema.index({ tableId: 1, status: 1 });

export const WaiterCall = model<IWaiterCall>('WaiterCall', waiterCallSchema);
export default WaiterCall;
