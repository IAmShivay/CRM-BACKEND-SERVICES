import mongoose, { Document, Schema } from "mongoose";
import { SMS_TYPES, SMS_LOG_STATUSES } from "@crm-platform/shared-types";

export interface ISmsLog extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  templateId?: string;
  to: string;
  message: string;
  type: "transactional" | "promotional" | "otp";
  status: "pending" | "sent" | "delivered" | "failed" | "rejected";
  provider: string;
  providerMessageId?: string;
  errorMessage?: string;
  variables?: Record<string, string>;
  entityType?: string;
  entityId?: string;
  cost?: number;
  sentBy: string;
  sentAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

const SmsLogSchema = new Schema<ISmsLog>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    templateId: { type: String, ref: "SmsTemplate" },
    to: { type: String, required: true, trim: true, maxlength: 15 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: { type: String, enum: [...SMS_TYPES], default: "transactional" },
    status: { type: String, enum: [...SMS_LOG_STATUSES], default: "pending" },
    provider: { type: String, required: true, trim: true, maxlength: 50 },
    providerMessageId: { type: String, trim: true },
    errorMessage: { type: String, trim: true, maxlength: 500 },
    variables: { type: Schema.Types.Mixed, default: {} },
    entityType: { type: String, trim: true, maxlength: 50 },
    entityId: { type: String, trim: true },
    cost: { type: Number, min: 0 },
    sentBy: { type: String, ref: "User", required: true },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

SmsLogSchema.index({ workspaceId: 1, createdAt: -1 });
SmsLogSchema.index({ workspaceId: 1, status: 1 });
SmsLogSchema.index({ workspaceId: 1, to: 1 });
SmsLogSchema.index({ workspaceId: 1, entityType: 1, entityId: 1 });
SmsLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SmsLog =
  mongoose.models?.SmsLog || mongoose.model<ISmsLog>("SmsLog", SmsLogSchema);
