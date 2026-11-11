import mongoose, { Schema } from "mongoose";
import { BOT_FLOW_STEP_TYPES } from "@crm-platform/shared-types";

export interface IBotFlowStep {
  id: string;
  type: "send_message" | "wait_for_reply" | "keyword_match" | "quick_reply" | "list_message" | "ai_reply" | "assign_human" | "delay" | "condition";
  data: Record<string, any>;
  position: { x: number; y: number };
  connections: Array<{ targetStepId: string; label?: string }>;
}

export interface IWhatsAppBotFlow {
  workspaceId: string;
  accountId: string;
  name: string;
  description?: string;
  steps: IBotFlowStep[];
  triggerKeywords?: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const BotFlowStepSchema = new Schema<IBotFlowStep>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: [...BOT_FLOW_STEP_TYPES],
      required: true,
    },
    data: { type: Schema.Types.Mixed, default: {} },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    connections: [
      {
        targetStepId: { type: String, required: true },
        label: { type: String },
        _id: false,
      },
    ],
  },
  { _id: false }
);

const WhatsAppBotFlowSchema = new Schema<IWhatsAppBotFlow>(
  {
    workspaceId: { type: String, required: true },
    accountId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    steps: [BotFlowStepSchema],
    triggerKeywords: [{ type: String }],
    isActive: { type: Boolean, default: false },
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

WhatsAppBotFlowSchema.index({ workspaceId: 1, accountId: 1 });
WhatsAppBotFlowSchema.index({ workspaceId: 1, isActive: 1 });

export const WhatsAppBotFlow =
  mongoose.models?.WhatsAppBotFlow ||
  mongoose.model<IWhatsAppBotFlow>("WhatsAppBotFlow", WhatsAppBotFlowSchema);
