import mongoose, { Schema } from "mongoose";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES, ENROLLMENT_STATUSES, BOT_TONE, REPLY_CHANNELS } from "@crm-platform/shared-types";

export interface ICampaignStep {
  order: number;
  channel: "email" | "whatsapp" | "sms" | "ai_reply";
  subject?: string;
  body: string;
  delayDays: number;
  delayHours: number;
  aiTone?: "professional" | "friendly" | "casual";
  aiContext?: string;
  replyViaChannel?: "email" | "whatsapp" | "sms";
}

export interface ICampaign {
  workspaceId: string;
  name: string;
  description?: string;
  steps: ICampaignStep[];
  status: "draft" | "active" | "paused" | "completed";
  createdBy: string;
  enrolledCount: number;
  completedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampaignEnrollment {
  workspaceId: string;
  campaignId: string;
  leadId?: string;
  contactId?: string;
  email?: string;
  phone?: string;
  currentStep: number;
  status: "active" | "completed" | "paused" | "failed" | "unsubscribed";
  nextSendAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const CampaignStepSchema = new Schema<ICampaignStep>(
  {
    order: { type: Number, required: true },
    channel: { type: String, enum: [...CAMPAIGN_CHANNELS], required: true },
    subject: { type: String, maxlength: 200 },
    body: { type: String, required: true },
    delayDays: { type: Number, default: 1, min: 0 },
    delayHours: { type: Number, default: 0, min: 0, max: 23 },
    aiTone: { type: String, enum: [...BOT_TONE] },
    aiContext: { type: String, maxlength: 2000 },
    replyViaChannel: { type: String, enum: [...REPLY_CHANNELS] },
  },
  { _id: false }
);

const CampaignSchema = new Schema<ICampaign>(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    steps: [CampaignStepSchema],
    status: { type: String, enum: [...CAMPAIGN_STATUSES], default: "draft" },
    createdBy: { type: String, ref: "User", required: true },
    enrolledCount: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
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

const CampaignEnrollmentSchema = new Schema<ICampaignEnrollment>(
  {
    workspaceId: { type: String, required: true, index: true },
    campaignId: { type: String, ref: "Campaign", required: true },
    leadId: { type: String, ref: "Lead" },
    contactId: { type: String, ref: "Contact" },
    email: { type: String },
    phone: { type: String },
    currentStep: { type: Number, default: 0 },
    status: { type: String, enum: [...ENROLLMENT_STATUSES], default: "active" },
    nextSendAt: { type: Date },
    completedAt: { type: Date },
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

CampaignEnrollmentSchema.index({ campaignId: 1, status: 1 });
CampaignEnrollmentSchema.index({ nextSendAt: 1, status: 1 });

export const Campaign =
  mongoose.models?.Campaign || mongoose.model<ICampaign>("Campaign", CampaignSchema);

export const CampaignEnrollment =
  mongoose.models?.CampaignEnrollment ||
  mongoose.model<ICampaignEnrollment>("CampaignEnrollment", CampaignEnrollmentSchema);
