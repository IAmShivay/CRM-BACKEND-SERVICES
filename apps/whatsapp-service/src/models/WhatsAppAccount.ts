import mongoose, { Document, Schema } from "mongoose";
import { WHATSAPP_PROVIDERS, QUALITY_RATINGS, BOT_TONE } from "@crm-platform/shared-types";

export interface IWhatsAppAccount extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  provider: "meta_cloud" | "wati" | "gupshup";
  phoneNumberId: string;
  businessAccountId?: string;
  displayName: string;
  phoneNumber: string;
  accessToken: string;
  webhookVerifyToken?: string;
  isActive: boolean;
  qualityRating?: "GREEN" | "YELLOW" | "RED";
  messagingLimit?: number;
  dailyMessageCount: number;
  lastResetDate: Date;
  botEnabled: boolean;
  botContext?: string;
  botTone?: "professional" | "friendly" | "casual";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppAccountSchema = new Schema<IWhatsAppAccount>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    provider: { type: String, enum: [...WHATSAPP_PROVIDERS], default: "meta_cloud" },
    phoneNumberId: { type: String, required: true, trim: true },
    businessAccountId: { type: String, trim: true },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    phoneNumber: { type: String, required: true, trim: true, maxlength: 15 },
    accessToken: { type: String, required: true },
    webhookVerifyToken: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    qualityRating: { type: String, enum: [...QUALITY_RATINGS] },
    messagingLimit: { type: Number, default: 250 },
    dailyMessageCount: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
    botEnabled: { type: Boolean, default: false },
    botContext: { type: String, maxlength: 2000 },
    botTone: { type: String, enum: [...BOT_TONE], default: "professional" },
    createdBy: { type: String, ref: "User", required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.accessToken;
        return ret;
      },
    },
  }
);

WhatsAppAccountSchema.index({ workspaceId: 1, isActive: 1 });
WhatsAppAccountSchema.index({ phoneNumberId: 1 }, { unique: true });

export const WhatsAppAccount =
  mongoose.models?.WhatsAppAccount ||
  mongoose.model<IWhatsAppAccount>("WhatsAppAccount", WhatsAppAccountSchema);
