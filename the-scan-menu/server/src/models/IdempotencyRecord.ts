import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  key: string;
  restaurantId: Types.ObjectId;
  diningSessionId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  endpoint: string;
  requestHash: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  statusCode?: number;
  responseBody?: any;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: { type: String, required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    diningSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    endpoint: { type: String, required: true },
    requestHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'COMPLETED', 'FAILED'],
      required: true,
      default: 'IN_PROGRESS',
    },
    statusCode: { type: Number, default: 201 },
    responseBody: { type: Schema.Types.Mixed },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour TTL
    },
  },
  {
    timestamps: true,
    collection: 'idempotency_records',
  }
);

idempotencyRecordSchema.index({ key: 1, restaurantId: 1 }, { unique: true });
idempotencyRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyRecord =
  (mongoose.models.IdempotencyRecord as mongoose.Model<IIdempotencyRecord>) ||
  model<IIdempotencyRecord>('IdempotencyRecord', idempotencyRecordSchema);

export default IdempotencyRecord;
