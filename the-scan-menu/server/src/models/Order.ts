import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { getOrderStatusRollup } from '../utils/orderStateMachine';
import { RestaurantSettings } from './RestaurantSettings';

// ==========================================
// ORDER COUNTER MODEL (for atomic sequence numbers)
// ==========================================

export interface IOrderCounter extends Document {
  restaurantId: Types.ObjectId;
  seq: number;
}

const orderCounterSchema = new Schema<IOrderCounter>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: 'order_counters' }
);

export const OrderCounter =
  (mongoose.models.OrderCounter as mongoose.Model<IOrderCounter>) ||
  model<IOrderCounter>('OrderCounter', orderCounterSchema);

// ==========================================
// ORDER MODEL
// ==========================================

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
export type OrderSource = 'QR' | 'POS' | 'WAITER' | 'MANUAL' | 'API';
export type OrderMode = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER';
export type PosSyncStatus = 'NOT_APPLICABLE' | 'PENDING' | 'SYNCED' | 'FAILED';

export interface IDeliveryAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fullAddress?: string;
  notes?: string;
}

export interface IOrderAddOn {
  name: string;
  priceDelta: number; // in cents/paise
}

export interface IOrderItem {
  menuItemId: Types.ObjectId;
  nameSnapshot: string;
  variantName?: string;
  unitPriceSnapshot: number; // in cents/paise (base item price)
  quantity: number;
  selectedAddOns: IOrderAddOn[];
  specialInstructions?: string;
  prepTimeMinutesSnapshot?: number;
  itemSubtotal: number; // (unitPrice + addOns) * quantity in paise/cents
  itemTax: number; // in paise/cents
  itemTotal: number; // in paise/cents
  itemStatus: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED';
  servedAt?: Date;
}

export interface IOrderTaxBreakdown {
  name: string;
  percentage: number;
  amount: number; // in cents/paise
  subTaxes?: {
    name: string;
    percentage: number;
    amount: number;
  }[];
}

export interface IOrder extends Document {
  restaurantId: Types.ObjectId;
  tableId?: Types.ObjectId;
  diningSessionId?: Types.ObjectId;
  sessionId?: Types.ObjectId; // Alias for backward compatibility
  guestSessionId?: Types.ObjectId;
  customerId?: Types.ObjectId;
  orderMode: OrderMode;
  deliveryAddress?: IDeliveryAddress;
  roundNumber?: number;
  isMerged: boolean;
  orderNumber: number; // Monotonically increasing per restaurant
  items: IOrderItem[];
  subtotal: number; // in cents/paise
  tax: number; // in cents/paise
  taxBreakdown: IOrderTaxBreakdown[]; // Snapshot of taxes applied
  roundOff?: number; // in cents/paise (+/-)
  total: number; // in cents/paise
  customerNote?: string;
  status: OrderStatus;
  source: OrderSource;
  customerName?: string;
  customerPhone?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'WAIVED';
  paymentMethod?: string; // e.g. 'UPI' | 'CASH' | 'CARD' | 'RAZORPAY'
  posSyncStatus: PosSyncStatus;
  posSyncRetries: number;
  posSyncLastError?: string;
  integrationMetadata: Record<string, any>;
  hasEarnedLoyaltyPoints?: boolean;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number; // in paise
  loyaltyPointsEarned?: number;
  isCleared: boolean;
  clearedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderAddOnSchema = new Schema<IOrderAddOn>(
  {
    name: { type: String, required: true, trim: true },
    priceDelta: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    nameSnapshot: { type: String, required: true, trim: true },
    variantName: { type: String, trim: true },
    unitPriceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedAddOns: [orderAddOnSchema],
    specialInstructions: { type: String, trim: true },
    prepTimeMinutesSnapshot: { type: Number },
    itemSubtotal: { type: Number, required: true, default: 0 },
    itemTax: { type: Number, required: true, default: 0 },
    itemTotal: { type: Number, required: true, default: 0 },
    itemStatus: {
      type: String,
      required: true,
      enum: ['PENDING', 'PREPARING', 'READY', 'SERVED'],
      default: 'PENDING',
    },
    servedAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: false, index: true },
    diningSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession', required: false, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession', required: false }, // Backwards compat
    guestSessionId: { type: Schema.Types.ObjectId, ref: 'GuestSession', required: false },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: false, index: true },
    orderMode: {
      type: String,
      required: true,
      enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'COUNTER'],
      default: 'DINE_IN',
    },
    deliveryAddress: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      fullAddress: { type: String, trim: true },
      notes: { type: String, trim: true },
    },
    roundNumber: { type: Number, required: false },
    isMerged: { type: Boolean, required: true, default: false },
    orderNumber: { type: Number, required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    taxBreakdown: [
      {
        name: { type: String, required: true },
        percentage: { type: Number, required: true },
        amount: { type: Number, required: true },
        subTaxes: [
          {
            name: { type: String, required: true },
            percentage: { type: Number, required: true },
            amount: { type: Number, required: true },
          },
        ],
      },
    ],
    roundOff: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    customerNote: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ['QR', 'POS', 'WAITER', 'MANUAL', 'API'],
      default: 'QR',
    },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['PENDING', 'PAID', 'WAIVED'],
      default: 'PENDING',
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'CASH',
    },
    posSyncStatus: {
      type: String,
      enum: ['NOT_APPLICABLE', 'PENDING', 'SYNCED', 'FAILED'],
      default: 'NOT_APPLICABLE',
    },
    posSyncRetries: { type: Number, required: true, default: 0 },
    posSyncLastError: { type: String },
    integrationMetadata: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    hasEarnedLoyaltyPoints: {
      type: Boolean,
      default: false,
    },
    loyaltyPointsRedeemed: {
      type: Number,
      default: 0,
    },
    loyaltyDiscount: {
      type: Number,
      default: 0,
    },
    loyaltyPointsEarned: {
      type: Number,
      default: 0,
    },
    isCleared: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    clearedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'orders',
  }
);

// Sync sessionId with diningSessionId for backwards compatibility
orderSchema.pre('validate', function (this: any, next) {
  if (this.diningSessionId && !this.sessionId) {
    this.sessionId = this.diningSessionId;
  } else if (this.sessionId && !this.diningSessionId) {
    this.diningSessionId = this.sessionId;
  }
  next();
});

// Pre-save hook to automatically compute and update aggregate status
orderSchema.pre('save', async function (this: any, next) {
  try {
    const settings = await RestaurantSettings.findOne({ restaurantId: this.restaurantId });
    const workflowMode = settings?.workflow?.orderWorkflowMode || 'FIVE_STEP';

    // If aggregate status was manually moved, sync item-level statuses
    if (this.isModified('status')) {
      const targetStatus: string = this.status;
      if (targetStatus === 'SERVED') {
        for (const item of this.items) {
          item.itemStatus = 'SERVED';
          if (!item.servedAt) {
            item.servedAt = new Date();
          }
        }
      } else if (targetStatus === 'READY') {
        for (const item of this.items) {
          item.itemStatus = 'READY';
        }
      } else if (targetStatus === 'PREPARING') {
        for (const item of this.items) {
          item.itemStatus = 'PREPARING';
        }
      } else if (targetStatus === 'PENDING' || targetStatus === 'ACCEPTED') {
        for (const item of this.items) {
          item.itemStatus = 'PENDING';
        }
      }
    }

    this.status = getOrderStatusRollup(this, workflowMode);
  } catch (err) {
    console.error('Error in order pre-save hook:', err);
  }
  next();
});

// Indexes
orderSchema.index({ restaurantId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ diningSessionId: 1, roundNumber: 1 });
orderSchema.index({ restaurantId: 1, isCleared: 1, status: 1 });
orderSchema.index({ restaurantId: 1, status: 1 });
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, customerId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, orderMode: 1, createdAt: -1 });

export const Order = (mongoose.models.Order as mongoose.Model<IOrder>) || model<IOrder>('Order', orderSchema);
export default Order;
