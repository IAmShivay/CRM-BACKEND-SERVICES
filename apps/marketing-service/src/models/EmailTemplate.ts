import mongoose, { Document, Schema } from "mongoose";
import { EMAIL_TEMPLATE_CATEGORIES } from "@crm-platform/shared-types";

export interface IEmailTemplate extends Omit<Document, "_id"> {
  _id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description?: string;
  category: "sales" | "marketing" | "support" | "onboarding" | "follow-up" | "custom";
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  variables: Array<{ name: string; placeholder: string; defaultValue?: string; required: boolean; type: string }>;
  stats: { timesUsed: number; lastUsedAt?: Date };
  isActive: boolean;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    userId: { type: String, ref: "User", required: true },
    workspaceId: { type: String, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 500 },
    category: { type: String, enum: [...EMAIL_TEMPLATE_CATEGORIES], default: "custom" },
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String },
    variables: [
      {
        name: { type: String, required: true },
        placeholder: { type: String, required: true },
        defaultValue: { type: String },
        required: { type: Boolean, default: false },
        type: { type: String, default: "text" },
        _id: false,
      },
    ],
    stats: {
      timesUsed: { type: Number, default: 0 },
      lastUsedAt: { type: Date },
    },
    isActive: { type: Boolean, default: true },
    isShared: { type: Boolean, default: true },
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

EmailTemplateSchema.index({ workspaceId: 1, isActive: 1, name: 1 });

export const EmailTemplate =
  mongoose.models?.EmailTemplate || mongoose.model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema);
