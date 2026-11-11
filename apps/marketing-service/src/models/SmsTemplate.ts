import mongoose, { Document, Schema } from "mongoose";
import { SMS_TYPES } from "@crm-platform/shared-types";

export interface ISmsTemplate extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  content: string;
  variables: string[];
  type: "transactional" | "promotional" | "otp";
  dltTemplateId?: string;
  senderId?: string;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SmsTemplateSchema = new Schema<ISmsTemplate>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    variables: [{ type: String, trim: true }],
    type: { type: String, enum: [...SMS_TYPES], default: "transactional" },
    dltTemplateId: { type: String, trim: true, maxlength: 50 },
    senderId: { type: String, trim: true, maxlength: 10 },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, ref: "User", required: true },
  },
  {
    timestamps: true,
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

SmsTemplateSchema.index({ workspaceId: 1, isActive: 1 });
SmsTemplateSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
SmsTemplateSchema.index({ workspaceId: 1, type: 1 });

export const SmsTemplate =
  mongoose.models?.SmsTemplate ||
  mongoose.model<ISmsTemplate>("SmsTemplate", SmsTemplateSchema);
