import mongoose, { Document, Schema } from "mongoose";
import { SOCIAL_PLATFORMS } from "@crm-platform/shared-types";

export interface ISocialAccount extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  platform: "facebook" | "instagram" | "linkedin" | "twitter";
  accountName: string;
  accountId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  profileUrl?: string;
  profileImage?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SocialAccountSchema = new Schema<ISocialAccount>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    platform: { type: String, enum: [...SOCIAL_PLATFORMS], required: true },
    accountName: { type: String, required: true, trim: true, maxlength: 100 },
    accountId: { type: String, required: true, trim: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date },
    profileUrl: { type: String, trim: true },
    profileImage: { type: String, trim: true },
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
        delete ret.accessToken;
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

SocialAccountSchema.index({ workspaceId: 1, platform: 1 });
SocialAccountSchema.index({ workspaceId: 1, accountId: 1 }, { unique: true });

export const SocialAccount =
  mongoose.models?.SocialAccount ||
  mongoose.model<ISocialAccount>("SocialAccount", SocialAccountSchema);
