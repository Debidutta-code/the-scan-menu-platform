import { Schema, model, Document } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>(
  {
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'counters',
  }
);

export const Counter = model<ICounter>('Counter', counterSchema);
export default Counter;
