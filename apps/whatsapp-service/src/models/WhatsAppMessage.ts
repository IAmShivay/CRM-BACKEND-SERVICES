import mongoose, { Document, Schema } from "mongoose";
import { WHATSAPP_MESSAGE_TYPES, WHATSAPP_MESSAGE_STATUSES, MESSAGE_DIRECTIONS } from "@crm-platform/shared-types";

export interface IWhatsAppMessage extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  accountId: string;
  conversationId?: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  messageType: "text" | "image" | "document" | "video" | "audio" | "template" | "interactive" | "button" | "location" | "contacts";
  content: string;
  mediaUrl?: string;
  mediaId?: string;
  mimeType?: string;
  fileName?: string;
  templateName?: string;
  templateVariables?: string[];
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  waMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  contactId?: string;
  leadId?: string;
  assignedTo?: string;
  isRead: boolean;
  readAt?: Date;
  metadata?: Record<string, any>;
  sentAt: Date;
  deliveredAt?: Date;
  readByRecipientAt?: Date;
  createdAt: Date;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    accountId: { type: String, ref: "WhatsAppAccount", required: true },
    conversationId: { type: String, trim: true },
    direction: { type: String, enum: [...MESSAGE_DIRECTIONS], required: true },
    from: { type: String, required: true, trim: true, maxlength: 20 },
    to: { type: String, required: true, trim: true, maxlength: 20 },
    messageType: {
      type: String,
      enum: [...WHATSAPP_MESSAGE_TYPES],
      default: "text",
    },
    content: { type: String, trim: true, maxlength: 4096 },
    mediaUrl: { type: String, trim: true },
    mediaId: { type: String, trim: true },
    mimeType: { type: String, trim: true },
    fileName: { type: String, trim: true },
    templateName: { type: String, trim: true },
    templateVariables: [{ type: String }],
    status: { type: String, enum: [...WHATSAPP_MESSAGE_STATUSES], default: "pending" },
    waMessageId: { type: String, trim: true },
    errorCode: { type: String, trim: true },
    errorMessage: { type: String, trim: true, maxlength: 500 },
    contactId: { type: String, ref: "Contact" },
    leadId: { type: String, ref: "Lead" },
    assignedTo: { type: String, ref: "User" },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    sentAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
    readByRecipientAt: { type: Date },
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

WhatsAppMessageSchema.index({ workspaceId: 1, from: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ workspaceId: 1, to: 1, createdAt: -1 });
WhatsAppMessageSchema.index({ workspaceId: 1, conversationId: 1, createdAt: 1 });
WhatsAppMessageSchema.index({ workspaceId: 1, contactId: 1 });
WhatsAppMessageSchema.index({ workspaceId: 1, leadId: 1 });
WhatsAppMessageSchema.index({ waMessageId: 1 }, { sparse: true });
WhatsAppMessageSchema.index({ workspaceId: 1, direction: 1, isRead: 1 });
WhatsAppMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const WhatsAppMessage =
  mongoose.models?.WhatsAppMessage ||
  mongoose.model<IWhatsAppMessage>("WhatsAppMessage", WhatsAppMessageSchema);
