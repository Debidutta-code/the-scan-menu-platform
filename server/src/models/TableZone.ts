import { Schema, model, Document, Types } from 'mongoose';

export interface ITableZone extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tableZoneSchema = new Schema<ITableZone>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'table_zones',
  }
);

// Prevent duplicate zone names within a restaurant
tableZoneSchema.index({ restaurantId: 1, name: 1 }, { unique: true });

export const TableZone = model<ITableZone>('TableZone', tableZoneSchema);
export default TableZone;
