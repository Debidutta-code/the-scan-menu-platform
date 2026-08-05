import mongoose, { Schema, model, Document } from 'mongoose';

export type AuditLogSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface IAuditLog extends Document {
  action: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  restaurantId?: string;
  restaurantName?: string;
  details?: Record<string, any>;
  severity: AuditLogSeverity;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
    },
    actorName: {
      type: String,
    },
    actorRole: {
      type: String,
    },
    restaurantId: {
      type: String,
      index: true,
    },
    restaurantName: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARN', 'CRITICAL'],
      default: 'INFO',
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  }
);

export const AuditLog = (mongoose.models.AuditLog as any) || model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
