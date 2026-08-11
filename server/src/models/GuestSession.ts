import mongoose, { Schema, model, Document, Types } from 'mongoose';

export interface IGuestSession extends Document {
  diningSessionId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  tableId: Types.ObjectId;
  guestToken: string;
  guestName: string;
  isHost: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guestSessionSchema = new Schema<IGuestSession>(
  {
    diningSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
    guestToken: { type: String, required: true, index: true },
    guestName: { type: String, required: true, trim: true, default: 'Guest' },
    isHost: { type: Boolean, required: true, default: false },
    joinedAt: { type: Date, required: true, default: Date.now },
    lastSeenAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'guest_sessions',
  }
);

// Indexes
guestSessionSchema.index({ diningSessionId: 1, guestToken: 1 }, { unique: true });
guestSessionSchema.index({ restaurantId: 1, guestToken: 1 });

export const GuestSession =
  (mongoose.models.GuestSession as mongoose.Model<IGuestSession>) ||
  model<IGuestSession>('GuestSession', guestSessionSchema);

export default GuestSession;
