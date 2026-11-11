import mongoose, { Document, Schema } from "mongoose";
import { LEAD_PRIORITIES } from "@crm-platform/shared-types";

export interface ILead extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  statusId?: string;
  source: string;
  value: number;
  assignedTo?: string;
  tags: string[];
  tagIds: string[];
  notes?: string;
  customData: Record<string, any>;
  leadScore: number;
  leadScoreFactors: string[];
  priority: "low" | "medium" | "high";
  lastContactedAt?: Date;
  nextFollowUpAt?: Date;
  createdBy: string;
  convertedToContactId?: string;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    phone: { type: String, trim: true },
    company: { type: String, trim: true, maxlength: 100 },
    status: { type: String, default: "New" },
    statusId: { type: String, ref: "LeadStatus" },
    source: { type: String, default: "manual", trim: true },
    value: { type: Number, default: 0, min: 0 },
    assignedTo: { type: String, ref: "User" },
    tags: [{ type: String, trim: true }],
    tagIds: [{ type: String, ref: "Tag" }],
    notes: { type: String, trim: true },
    customData: { type: Schema.Types.Mixed, default: {} },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    leadScoreFactors: { type: [String], default: [] },
    priority: {
      type: String,
      enum: [...LEAD_PRIORITIES],
      default: "medium",
    },
    lastContactedAt: { type: Date },
    nextFollowUpAt: { type: Date },
    createdBy: { type: String, ref: "User", required: true },
    convertedToContactId: { type: Schema.Types.ObjectId, ref: "Contact" },
    convertedAt: { type: Date },
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

LeadSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
LeadSchema.index({ workspaceId: 1, source: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, priority: 1, status: 1 });
LeadSchema.index({ workspaceId: 1, tagIds: 1 });
LeadSchema.index({ email: 1 }, { sparse: true });
LeadSchema.index({ nextFollowUpAt: 1 }, { sparse: true });
LeadSchema.index(
  { name: "text", email: "text", company: "text", phone: "text" },
  { weights: { name: 10, email: 5, company: 3, phone: 1 } }
);

export const Lead =
  mongoose.models?.Lead || mongoose.model<ILead>("Lead", LeadSchema);
