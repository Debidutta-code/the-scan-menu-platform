import { Schema, model, Document, Types } from 'mongoose';

export type InventoryAction = 'AVAILABILITY_TOGGLE' | 'STOCK_ADJUSTMENT' | 'ORDER_DECREMENT' | 'AUTO_86';
export type ActorType = 'MANAGER' | 'STAFF' | 'SYSTEM' | 'ORDER';

export interface IInventoryLog extends Document {
  restaurantId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  actorType: ActorType;
  actorId?: Types.ObjectId;
  action: InventoryAction;
  previousQuantity?: number;
  newQuantity?: number;
  previousAvailability: boolean;
  newAvailability: boolean;
  orderId?: Types.ObjectId;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true, index: true },
    actorType: {
      type: String,
      enum: ['MANAGER', 'STAFF', 'SYSTEM', 'ORDER'],
      required: true,
    },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: {
      type: String,
      enum: ['AVAILABILITY_TOGGLE', 'STOCK_ADJUSTMENT', 'ORDER_DECREMENT', 'AUTO_86'],
      required: true,
    },
    previousQuantity: { type: Number },
    newQuantity: { type: Number },
    previousAvailability: { type: Boolean, required: true },
    newAvailability: { type: Boolean, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    reason: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'inventory_logs',
  }
);

inventoryLogSchema.index({ restaurantId: 1, menuItemId: 1, createdAt: -1 });

export const InventoryLog = model<IInventoryLog>('InventoryLog', inventoryLogSchema);
export default InventoryLog;
