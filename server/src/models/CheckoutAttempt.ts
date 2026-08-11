import mongoose, { Schema, model, Document, Types } from 'mongoose';
import { IOrderTaxBreakdown } from './Order';

export type CheckoutAttemptStatus =
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'ORDER_CREATED'
  | 'PAYMENT_FAILED'
  | 'EXPIRED'
  | 'RECONCILIATION_REQUIRED';

export interface ICartSnapshotItem {
  menuItemId: Types.ObjectId;
  nameSnapshot: string;
  unitPriceSnapshot: number; // in paise/cents
  quantity: number;
  selectedAddOns: { name: string; priceDelta: number }[];
  specialInstructions?: string;
  itemSubtotal: number;
  itemTax: number;
  itemTotal: number;
}

export interface ICheckoutAttempt extends Document {
  restaurantId: Types.ObjectId;
  tableId?: Types.ObjectId;
  diningSessionId?: Types.ObjectId;
  guestSessionId?: Types.ObjectId;
  idempotencyKey: string;
  customerName?: string;
  customerPhone?: string;
  customerNote?: string;
  orderMode: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'COUNTER';
  deliveryAddress?: Record<string, any>;
  cartSnapshot: ICartSnapshotItem[];
  subtotal: number; // in paise/cents
  tax: number; // in paise/cents
  taxBreakdown: IOrderTaxBreakdown[];
  total: number; // in paise/cents
  status: CheckoutAttemptStatus;
  gatewayProvider: 'CASH' | 'RAZORPAY' | 'STRIPE' | 'SQUARE';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  orderId?: Types.ObjectId;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cartSnapshotItemSchema = new Schema(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    nameSnapshot: { type: String, required: true },
    unitPriceSnapshot: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedAddOns: [
      {
        name: { type: String, required: true },
        priceDelta: { type: Number, required: true, default: 0 },
      },
    ],
    specialInstructions: { type: String, trim: true },
    itemSubtotal: { type: Number, required: true },
    itemTax: { type: Number, required: true, default: 0 },
    itemTotal: { type: Number, required: true },
  },
  { _id: false }
);

const checkoutAttemptSchema = new Schema<ICheckoutAttempt>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableId: { type: Schema.Types.ObjectId, ref: 'Table' },
    diningSessionId: { type: Schema.Types.ObjectId, ref: 'DiningSession' },
    guestSessionId: { type: Schema.Types.ObjectId, ref: 'GuestSession' },
    idempotencyKey: { type: String, required: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    customerNote: { type: String, trim: true },
    orderMode: {
      type: String,
      required: true,
      enum: ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'COUNTER'],
      default: 'DINE_IN',
    },
    deliveryAddress: { type: Schema.Types.Mixed },
    cartSnapshot: [cartSnapshotItemSchema],
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
    total: { type: Number, required: true },
    status: {
      type: String,
      required: true,
      enum: [
        'PAYMENT_PENDING',
        'PAYMENT_SUCCESS',
        'ORDER_CREATED',
        'PAYMENT_FAILED',
        'EXPIRED',
        'RECONCILIATION_REQUIRED',
      ],
      default: 'PAYMENT_PENDING',
      index: true,
    },
    gatewayProvider: {
      type: String,
      required: true,
      enum: ['CASH', 'RAZORPAY', 'STRIPE', 'SQUARE'],
      default: 'RAZORPAY',
    },
    gatewayOrderId: { type: String, trim: true },
    gatewayPaymentId: { type: String, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    errorMessage: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'checkout_attempts',
  }
);

// Indexes
checkoutAttemptSchema.index({ idempotencyKey: 1 }, { unique: true });
checkoutAttemptSchema.index({ gatewayOrderId: 1 }, { sparse: true });
checkoutAttemptSchema.index({ status: 1, createdAt: -1 });

export const CheckoutAttempt =
  (mongoose.models.CheckoutAttempt as mongoose.Model<ICheckoutAttempt>) ||
  model<ICheckoutAttempt>('CheckoutAttempt', checkoutAttemptSchema);

export default CheckoutAttempt;
