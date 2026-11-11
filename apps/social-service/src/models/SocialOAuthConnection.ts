import mongoose, { Document, Schema } from "mongoose";
import { SOCIAL_OAUTH_PROVIDERS } from "@crm-platform/shared-types";

export interface ISocialOAuthConnection extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  userId: string;
  provider: "linkedin" | "meta";
  providerAccountId: string;
  displayName: string;
  email?: string;
  profilePicture?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes: string[];
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SocialOAuthConnectionSchema = new Schema<ISocialOAuthConnection>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true, index: true },
    userId: { type: String, ref: "User", required: true, index: true },
    provider: { type: String, enum: [...SOCIAL_OAUTH_PROVIDERS], required: true },
    providerAccountId: { type: String, required: true },
    displayName: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    profilePicture: { type: String },
    accessToken: { type: String, required: true, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    scopes: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.accessToken;
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

SocialOAuthConnectionSchema.index({ workspaceId: 1, provider: 1, providerAccountId: 1 }, { unique: true });

export const SocialOAuthConnection =
  mongoose.models?.SocialOAuthConnection ||
  mongoose.model<ISocialOAuthConnection>("SocialOAuthConnection", SocialOAuthConnectionSchema);
