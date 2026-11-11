import mongoose, { Document, Schema } from "mongoose";
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUSES } from "@crm-platform/shared-types";

export interface ISocialPost extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  content: string;
  mediaUrls?: string[];
  platforms: Array<{
    platform: "facebook" | "instagram" | "linkedin" | "twitter";
    accountId: string;
    customContent?: string;
    status: "draft" | "scheduled" | "publishing" | "published" | "failed";
    publishedAt?: Date;
    externalPostId?: string;
    error?: string;
    analytics?: {
      likes: number;
      shares: number;
      comments: number;
      reach: number;
    };
  }>;
  scheduledAt?: Date;
  publishedAt?: Date;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  aiGenerated: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostPlatformSchema = new Schema(
  {
    platform: { type: String, enum: [...SOCIAL_PLATFORMS], required: true },
    accountId: { type: String, required: true },
    customContent: { type: String },
    status: { type: String, enum: [...SOCIAL_POST_STATUSES], default: "draft" },
    publishedAt: { type: Date },
    externalPostId: { type: String },
    error: { type: String },
    analytics: {
      likes: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const SocialPostSchema = new Schema<ISocialPost>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    content: { type: String, required: true, maxlength: 5000 },
    mediaUrls: { type: [String], default: [] },
    platforms: {
      type: [SocialPostPlatformSchema],
      required: true,
      validate: {
        validator: (v: any[]) => v.length > 0,
        message: "At least one platform is required",
      },
    },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    status: { type: String, enum: [...SOCIAL_POST_STATUSES], default: "draft" },
    aiGenerated: { type: Boolean, default: false },
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

SocialPostSchema.index({ workspaceId: 1, status: 1, scheduledAt: 1 });
SocialPostSchema.index({ workspaceId: 1, createdAt: -1 });

export const SocialPost =
  mongoose.models?.SocialPost ||
  mongoose.model<ISocialPost>("SocialPost", SocialPostSchema);
