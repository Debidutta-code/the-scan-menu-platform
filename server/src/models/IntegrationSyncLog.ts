import mongoose, { Schema, model, Document, Types } from 'mongoose';

export type IntegrationSyncOperation = 'SYNC_MENU' | 'PUSH_ORDER' | 'UPDATE_STATUS';
export type IntegrationSyncStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'MANUAL_INTERVENTION'
  | 'ORDER_SYNC_PENDING'
  | 'ORDER_SYNCED'
  | 'ORDER_SYNC_FAILED';

export interface IIntegrationSyncLog extends Document {
  restaurantId: Types.ObjectId;
  orderId?: Types.ObjectId;
  provider: string;
  operation: IntegrationSyncOperation;
  status: IntegrationSyncStatus;
  syncAttempts: number;
  maxRetries: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date | null;
  isLocked?: boolean;
  errorMessage?: string;
  errorLog?: string;
  payloadSnapshot?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const integrationSyncLogSchema = new Schema<IIntegrationSyncLog>(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    provider: { type: String, required: true },
    operation: {
      type: String,
      required: true,
      enum: ['SYNC_MENU', 'PUSH_ORDER', 'UPDATE_STATUS'],
      default: 'PUSH_ORDER',
    },
    status: {
      type: String,
      required: true,
      enum: [
        'PENDING',
        'SUCCESS',
        'FAILED',
        'RETRYING',
        'MANUAL_INTERVENTION',
        'ORDER_SYNC_PENDING',
        'ORDER_SYNCED',
        'ORDER_SYNC_FAILED',
      ],
      default: 'PENDING',
    },
    syncAttempts: { type: Number, required: true, default: 1 },
    maxRetries: { type: Number, required: true, default: 5 },
    lastAttemptAt: { type: Date, default: Date.now },
    nextRetryAt: { type: Date },
    isLocked: { type: Boolean, default: false },
    errorMessage: { type: String, trim: true },
    errorLog: { type: String, trim: true },
    payloadSnapshot: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'integration_sync_logs',
  }
);

// Indexes
integrationSyncLogSchema.index({ restaurantId: 1, createdAt: -1 });
integrationSyncLogSchema.index({ restaurantId: 1, status: 1 });
integrationSyncLogSchema.index({ orderId: 1 });
integrationSyncLogSchema.index({ status: 1, nextRetryAt: 1 });

export const IntegrationSyncLog =
  (mongoose.models.IntegrationSyncLog as mongoose.Model<IIntegrationSyncLog>) ||
  model<IIntegrationSyncLog>('IntegrationSyncLog', integrationSyncLogSchema);
export default IntegrationSyncLog;
