import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type WebhookEventType =
  | 'order.created'
  | 'order.status_updated'
  | 'inventory.low_stock'
  | 'table_session.closed';

export interface IWebhookDeliveryLog {
  _id?: Types.ObjectId;
  event: string;
  payload: any;
  responseStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attempts: number;
  deliveredAt: Date;
}

export interface IWebhookSubscription extends Document {
  restaurantId: Types.ObjectId;
  targetUrl: string;
  events: WebhookEventType[];
  secret: string; // HMAC secret
  isActive: boolean;
  failureCount: number;
  deliveryLogs: IWebhookDeliveryLog[];
  createdAt: Date;
  updatedAt: Date;
}

const webhookDeliveryLogSchema = new Schema<IWebhookDeliveryLog>(
  {
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    responseStatus: { type: Number },
    responseBody: { type: String },
    errorMessage: { type: String },
    attempts: { type: Number, default: 1 },
    deliveredAt: { type: Date, default: Date.now },
  },
  { _id: true, timestamps: false }
);

const webhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    targetUrl: { type: String, required: true, trim: true },
    events: [{ type: String, required: true }],
    secret: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    failureCount: { type: Number, default: 0 },
    deliveryLogs: [webhookDeliveryLogSchema],
  },
  {
    timestamps: true,
    collection: 'webhook_subscriptions',
  }
);

webhookSubscriptionSchema.index({ restaurantId: 1, isActive: 1 });

export const WebhookSubscription =
  (mongoose.models.WebhookSubscription as any) ||
  model<IWebhookSubscription>('WebhookSubscription', webhookSubscriptionSchema);
export default WebhookSubscription;
