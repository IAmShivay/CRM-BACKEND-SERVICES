import mongoose, { Schema } from "mongoose";
import { CAMPAIGN_CHANNELS, SEQUENCE_STATUSES, SEQUENCE_ENROLLMENT_STATUSES, BOT_TONE, REPLY_CHANNELS } from "@crm-platform/shared-types";

export interface IEmailSequenceStep {
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

export interface IEmailSequence {
  workspaceId: string;
  name: string;
  description?: string;
  steps: IEmailSequenceStep[];
  status: "draft" | "active" | "paused";
  createdBy: string;
  enrolledCount: number;
  completedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISequenceEnrollment {
  workspaceId: string;
  sequenceId: string;
  leadId?: string;
  contactId?: string;
  email?: string;
  phone?: string;
  currentStep: number;
  status: "active" | "completed" | "paused" | "bounced" | "unsubscribed";
  nextSendAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const EmailSequenceStepSchema = new Schema<IEmailSequenceStep>(
  {
    order: { type: Number, required: true },
    channel: { type: String, enum: [...CAMPAIGN_CHANNELS], default: "email" },
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

const EmailSequenceSchema = new Schema<IEmailSequence>(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    steps: [EmailSequenceStepSchema],
    status: { type: String, enum: [...SEQUENCE_STATUSES], default: "draft" },
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

const SequenceEnrollmentSchema = new Schema<ISequenceEnrollment>(
  {
    workspaceId: { type: String, required: true, index: true },
    sequenceId: { type: String, ref: "EmailSequence", required: true },
    leadId: { type: String, ref: "Lead" },
    contactId: { type: String, ref: "Contact" },
    email: { type: String },
    phone: { type: String },
    currentStep: { type: Number, default: 0 },
    status: { type: String, enum: [...SEQUENCE_ENROLLMENT_STATUSES], default: "active" },
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

SequenceEnrollmentSchema.index({ sequenceId: 1, status: 1 });
SequenceEnrollmentSchema.index({ nextSendAt: 1, status: 1 });
SequenceEnrollmentSchema.index({ sequenceId: 1, email: 1 }, { unique: true });

export const EmailSequence =
  mongoose.models?.EmailSequence ||
  mongoose.model<IEmailSequence>("EmailSequence", EmailSequenceSchema);

export const SequenceEnrollment =
  mongoose.models?.SequenceEnrollment ||
  mongoose.model<ISequenceEnrollment>("SequenceEnrollment", SequenceEnrollmentSchema);
