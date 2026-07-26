import { Schema, model, Document, Types } from 'mongoose';

export interface ITax extends Document {
  restaurantId: Types.ObjectId;
  name: string;
  percentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taxSchema = new Schema<ITax>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'taxes',
  }
);

export const Tax = model<ITax>('Tax', taxSchema);
export default Tax;
