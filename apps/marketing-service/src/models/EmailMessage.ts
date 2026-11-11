import mongoose, { Document, Schema } from "mongoose";
import { EMAIL_MESSAGE_DIRECTIONS, EMAIL_MESSAGE_STATUSES, EMAIL_PRIORITIES, EMAIL_SYNC_STATUSES } from "@crm-platform/shared-types";

export interface IEmailAddress {
  name?: string;
  email: string;
}

export interface IEmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  attachmentId: string;
  isInline: boolean;
  contentId?: string;
}

export interface IEmailMessage extends Omit<Document, "_id"> {
  _id: string;
  userId: string;
  workspaceId: string;
  emailAccountId: string;
  messageId: string;
  threadId?: string;
  from: IEmailAddress;
  to: IEmailAddress[];
  cc: IEmailAddress[];
  bcc: IEmailAddress[];
  replyTo?: IEmailAddress;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  snippet?: string;
  attachments: IEmailAttachment[];
  direction: "inbound" | "outbound" | "draft";
  status: "draft" | "sent" | "delivered" | "failed" | "bounced" | "read";
  priority: "low" | "normal" | "high";
  sentAt?: Date;
  receivedAt?: Date;
  readAt?: Date;
  folder: string;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  isSnoozed: boolean;
  snoozeUntil?: Date;
  linkedLeadId?: string;
  linkedContactId?: string;
  linkedProjectId?: string;
  linkedTaskId?: string;
  providerData: { internalDate?: Date; size?: number; flags?: string[]; conversationId?: string };
  syncStatus: "pending" | "synced" | "failed" | "ignored";
  syncedAt?: Date;
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema({ name: { type: String, trim: true }, email: { type: String, required: true, lowercase: true } }, { _id: false });

const AttachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    attachmentId: { type: String, required: true },
    isInline: { type: Boolean, default: false },
    contentId: { type: String },
  },
  { _id: false }
);

const EmailMessageSchema = new Schema<IEmailMessage>(
  {
    userId: { type: String, ref: "User", required: true, index: true },
    workspaceId: { type: String, ref: "Workspace", required: true },
    emailAccountId: { type: String, ref: "EmailAccount", required: true, index: true },
    messageId: { type: String, required: true },
    threadId: { type: String },
    from: { type: AddressSchema, required: true },
    to: [AddressSchema],
    cc: [AddressSchema],
    bcc: [AddressSchema],
    replyTo: { type: AddressSchema },
    subject: { type: String, default: "", trim: true },
    bodyText: { type: String },
    bodyHtml: { type: String },
    snippet: { type: String },
    attachments: [AttachmentSchema],
    direction: { type: String, enum: [...EMAIL_MESSAGE_DIRECTIONS], required: true },
    status: { type: String, enum: [...EMAIL_MESSAGE_STATUSES], default: "sent" },
    priority: { type: String, enum: [...EMAIL_PRIORITIES], default: "normal" },
    sentAt: { type: Date },
    receivedAt: { type: Date },
    readAt: { type: Date },
    folder: { type: String, required: true, default: "INBOX" },
    labels: [{ type: String }],
    isRead: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    isImportant: { type: Boolean, default: false },
    isSnoozed: { type: Boolean, default: false },
    snoozeUntil: { type: Date },
    linkedLeadId: { type: String, ref: "Lead" },
    linkedContactId: { type: String, ref: "Contact" },
    linkedProjectId: { type: String, ref: "Project" },
    linkedTaskId: { type: String, ref: "Task" },
    providerData: {
      internalDate: { type: Date },
      size: { type: Number },
      flags: [{ type: String }],
      conversationId: { type: String },
    },
    syncStatus: { type: String, enum: [...EMAIL_SYNC_STATUSES], default: "synced" },
    syncedAt: { type: Date },
    syncError: { type: String },
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

EmailMessageSchema.index({ emailAccountId: 1, messageId: 1 }, { unique: true });
EmailMessageSchema.index({ workspaceId: 1, emailAccountId: 1, folder: 1, receivedAt: -1 });
EmailMessageSchema.index({ workspaceId: 1, "attachments.attachmentId": 1 });
EmailMessageSchema.index({ subject: "text", bodyText: "text", "from.email": "text" });

export const EmailMessage =
  mongoose.models?.EmailMessage || mongoose.model<IEmailMessage>("EmailMessage", EmailMessageSchema);
