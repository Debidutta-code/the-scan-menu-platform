import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBillCounter extends Document {
  restaurantId: Types.ObjectId;
  year: number;
  seq: number;
  updatedAt: Date;
}

const billCounterSchema = new Schema<IBillCounter>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true, collection: 'bill_counters' }
);

billCounterSchema.index({ restaurantId: 1, year: 1 }, { unique: true });

export const BillCounter =
  (mongoose.models.BillCounter as mongoose.Model<IBillCounter>) ||
  mongoose.model<IBillCounter>('BillCounter', billCounterSchema);

export default BillCounter;
