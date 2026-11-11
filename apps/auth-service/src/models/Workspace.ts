import mongoose, { Document, Schema } from "mongoose";
import { WORKSPACE_CURRENCIES, DATE_FORMATS, TIME_FORMATS, LANGUAGES, WORKSPACE_SUBSCRIPTION_STATUSES } from "@crm-platform/shared-types";

export interface IWorkspace extends Omit<Document, "_id"> {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  currency: string;
  timezone: string;
  planId: string;
  subscriptionStatus: string;
  settings: {
    dateFormat: string;
    timeFormat: string;
    weekStartsOn: number;
    language: string;
    autoCreateDeal: boolean;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      enum: [...WORKSPACE_CURRENCIES],
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },
    settings: {
      dateFormat: {
        type: String,
        default: "MM/DD/YYYY",
        enum: [...DATE_FORMATS],
      },
      timeFormat: {
        type: String,
        default: "12h",
        enum: [...TIME_FORMATS],
      },
      weekStartsOn: {
        type: Number,
        default: 0,
        min: 0,
        max: 6,
      },
      language: {
        type: String,
        default: "en",
        enum: [...LANGUAGES],
      },
      autoCreateDeal: {
        type: Boolean,
        default: false,
      },
    },
    planId: {
      type: String,
      ref: "Plan",
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      enum: [...WORKSPACE_SUBSCRIPTION_STATUSES],
      default: "active",
    },
    createdBy: {
      type: String,
      ref: "User",
      required: true,
    },
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

WorkspaceSchema.index({ subscriptionStatus: 1, planId: 1 });

export const Workspace =
  mongoose.models?.Workspace ||
  mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
