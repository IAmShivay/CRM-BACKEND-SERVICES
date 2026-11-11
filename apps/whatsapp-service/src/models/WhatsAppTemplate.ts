import mongoose, { Document, Schema } from "mongoose";
import { WHATSAPP_TEMPLATE_CATEGORIES, WHATSAPP_TEMPLATE_STATUSES, WHATSAPP_HEADER_TYPES, WHATSAPP_BUTTON_TYPES } from "@crm-platform/shared-types";

export interface IWhatsAppTemplate extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  accountId: string;
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  status: "APPROVED" | "PENDING" | "REJECTED";
  headerType?: "NONE" | "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  headerContent?: string;
  bodyText: string;
  footerText?: string;
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phoneNumber?: string;
  }>;
  variables: string[];
  metaTemplateId?: string;
  usageCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ButtonSchema = new Schema(
  {
    type: { type: String, enum: [...WHATSAPP_BUTTON_TYPES], required: true },
    text: { type: String, required: true, trim: true, maxlength: 25 },
    url: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
  },
  { _id: false }
);

const WhatsAppTemplateSchema = new Schema<IWhatsAppTemplate>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    accountId: { type: String, ref: "WhatsAppAccount", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100, match: /^[a-z0-9_]+$/ },
    language: { type: String, default: "en", trim: true, maxlength: 10 },
    category: { type: String, enum: [...WHATSAPP_TEMPLATE_CATEGORIES], default: "UTILITY" },
    status: { type: String, enum: [...WHATSAPP_TEMPLATE_STATUSES], default: "PENDING" },
    headerType: { type: String, enum: [...WHATSAPP_HEADER_TYPES], default: "NONE" },
    headerContent: { type: String, trim: true },
    bodyText: { type: String, required: true, trim: true, maxlength: 1024 },
    footerText: { type: String, trim: true, maxlength: 60 },
    buttons: [ButtonSchema],
    variables: [{ type: String, trim: true }],
    metaTemplateId: { type: String, trim: true },
    usageCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
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

WhatsAppTemplateSchema.index({ workspaceId: 1, accountId: 1 });
WhatsAppTemplateSchema.index({ accountId: 1, name: 1, language: 1 }, { unique: true });
WhatsAppTemplateSchema.index({ workspaceId: 1, status: 1 });

export const WhatsAppTemplate =
  mongoose.models?.WhatsAppTemplate ||
  mongoose.model<IWhatsAppTemplate>("WhatsAppTemplate", WhatsAppTemplateSchema);
