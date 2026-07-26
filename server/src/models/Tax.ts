import { Schema, model, Document, Types } from 'mongoose';

export type TaxType = 'GROUP' | 'TAX';

export interface ITax extends Document {
  restaurantId: Types.ObjectId;
  type: TaxType;
  groupId?: Types.ObjectId; // Only applicable if type === 'TAX'
  name: string;
  percentage: number; // 0 for 'GROUP'
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taxSchema = new Schema<ITax>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    type: { type: String, enum: ['GROUP', 'TAX'], required: true, default: 'TAX' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Tax', required: false },
    name: { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: 'taxes',
  }
);

export const Tax = model<ITax>('Tax', taxSchema);
export default Tax;
