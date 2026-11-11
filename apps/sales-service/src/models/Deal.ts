import mongoose, { Document, Schema } from "mongoose";
import { DEAL_PRIORITIES, DEAL_STATUSES } from "@crm-platform/shared-types";

export interface IDeal extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  pipelineId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  contactId?: string;
  leadId?: string;
  assignedTo?: string;
  priority: "low" | "medium" | "high";
  status: "open" | "won" | "lost" | "abandoned";
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  lostReason?: string;
  wonNote?: string;
  source?: string;
  tags: string[];
  tagIds: string[];
  customData: Record<string, any>;
  notes?: string;
  stageEnteredAt: Date;
  stageHistory: Array<{
    stageId: string;
    stageName: string;
    enteredAt: Date;
    exitedAt?: Date;
    duration?: number;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const StageHistorySchema = new Schema(
  {
    stageId: { type: String, required: true },
    stageName: { type: String, required: true },
    enteredAt: { type: Date, required: true },
    exitedAt: { type: Date },
    duration: { type: Number },
  },
  { _id: false }
);

const DealSchema = new Schema<IDeal>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    pipelineId: { type: String, ref: "Pipeline", required: true },
    stageId: { type: String, ref: "PipelineStage", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    value: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", trim: true, maxlength: 5 },
    contactId: { type: String, ref: "Contact" },
    leadId: { type: String, ref: "Lead" },
    assignedTo: { type: String, ref: "User" },
    priority: {
      type: String,
      enum: [...DEAL_PRIORITIES],
      default: "medium",
    },
    status: {
      type: String,
      enum: [...DEAL_STATUSES],
      default: "open",
    },
    probability: { type: Number, default: 0, min: 0, max: 100 },
    expectedCloseDate: { type: Date },
    actualCloseDate: { type: Date },
    lostReason: { type: String, trim: true, maxlength: 500 },
    wonNote: { type: String, trim: true, maxlength: 500 },
    source: { type: String, trim: true, maxlength: 100 },
    tags: [{ type: String, trim: true }],
    tagIds: [{ type: String, ref: "Tag" }],
    customData: { type: Schema.Types.Mixed, default: {} },
    notes: { type: String, trim: true, maxlength: 5000 },
    stageEnteredAt: { type: Date, default: Date.now },
    stageHistory: [StageHistorySchema],
    createdBy: { type: String, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        if (ret.customData) {
          ret.customFields = ret.customData;
        }
        return ret;
      },
    },
  }
);

DealSchema.index({ workspaceId: 1, pipelineId: 1, stageId: 1 });
DealSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
DealSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
DealSchema.index({ workspaceId: 1, contactId: 1 });
DealSchema.index({ workspaceId: 1, leadId: 1 });
DealSchema.index({ workspaceId: 1, expectedCloseDate: 1 });
DealSchema.index({ workspaceId: 1, tagIds: 1 });
DealSchema.index(
  { title: "text", notes: "text" },
  { weights: { title: 10, notes: 1 } }
);

export const Deal =
  mongoose.models?.Deal || mongoose.model<IDeal>("Deal", DealSchema);
