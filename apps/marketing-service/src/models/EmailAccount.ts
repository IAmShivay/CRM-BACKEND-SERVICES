import mongoose, { Document, Schema } from "mongoose";
import { EMAIL_ACCOUNT_PROVIDERS, EMAIL_CONNECTION_STATUSES } from "@crm-platform/shared-types";

export interface IEmailAccount extends Omit<Document, "_id"> {
  _id: string;
  userId: string;
  workspaceId: string;
  provider: "gmail" | "outlook" | "smtp" | "imap";
  displayName: string;
  emailAddress: string;
  isActive: boolean;
  isDefault: boolean;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  oauthExpiresAt?: Date;
  oauthScope?: string;
  providerAccountId?: string;
  smtpConfig?: { host: string; port: number; secure: boolean; username?: string; password?: string };
  imapConfig?: { host: string; port: number; secure: boolean; username?: string; password?: string };
  settings: {
    signature: string;
    autoReply: boolean;
    autoReplyMessage: string;
    syncEnabled: boolean;
    syncInterval: number;
    lastSyncAt?: Date;
    folders: { inbox: string; sent: string; drafts: string; trash: string; custom: Array<{ name: string; path: string }> };
  };
  stats: { emailsSent: number; emailsReceived: number; lastUsedAt?: Date; quotaUsed: number; quotaLimit?: number };
  connectionStatus: "connected" | "disconnected" | "expired" | "not_configured" | "error" | "testing";
  createdAt: Date;
  updatedAt: Date;
}

const CredentialsSchema = new Schema(
  {
    host: { type: String },
    port: { type: Number },
    secure: { type: Boolean, default: true },
    username: { type: String, select: false },
    password: { type: String, select: false },
  },
  { _id: false }
);

const EmailAccountSchema = new Schema<IEmailAccount>(
  {
    userId: { type: String, ref: "User", required: true, index: true },
    workspaceId: { type: String, ref: "Workspace", required: true, index: true },
    provider: { type: String, enum: [...EMAIL_ACCOUNT_PROVIDERS], required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    emailAddress: { type: String, required: true, lowercase: true, trim: true },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    oauthAccessToken: { type: String, select: false },
    oauthRefreshToken: { type: String, select: false },
    oauthExpiresAt: { type: Date },
    oauthScope: { type: String },
    providerAccountId: { type: String },
    smtpConfig: { type: CredentialsSchema },
    imapConfig: { type: CredentialsSchema },
    settings: {
      signature: { type: String, default: "" },
      autoReply: { type: Boolean, default: false },
      autoReplyMessage: { type: String, default: "" },
      syncEnabled: { type: Boolean, default: true },
      syncInterval: { type: Number, default: 15, min: 5, max: 1440 },
      lastSyncAt: { type: Date },
      folders: {
        inbox: { type: String, default: "INBOX" },
        sent: { type: String, default: "SENT" },
        drafts: { type: String, default: "DRAFT" },
        trash: { type: String, default: "TRASH" },
        custom: [{ name: { type: String, required: true }, path: { type: String, required: true } }],
      },
    },
    stats: {
      emailsSent: { type: Number, default: 0, min: 0 },
      emailsReceived: { type: Number, default: 0, min: 0 },
      lastUsedAt: { type: Date },
      quotaUsed: { type: Number, default: 0, min: 0 },
      quotaLimit: { type: Number },
    },
    connectionStatus: { type: String, enum: [...EMAIL_CONNECTION_STATUSES], default: "disconnected" },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.oauthAccessToken;
        delete ret.oauthRefreshToken;
        if (ret.smtpConfig) delete ret.smtpConfig.password;
        if (ret.imapConfig) delete ret.imapConfig.password;
        return ret;
      },
    },
  }
);

EmailAccountSchema.index({ workspaceId: 1, emailAddress: 1 });
EmailAccountSchema.index({ workspaceId: 1, userId: 1, isActive: 1 });

export const EmailAccount =
  mongoose.models?.EmailAccount || mongoose.model<IEmailAccount>("EmailAccount", EmailAccountSchema);
