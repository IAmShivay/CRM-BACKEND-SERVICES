import mongoose, { Document, Schema } from "mongoose";
import { ENTITY_TYPES, ACTIVITY_TYPES } from "@crm-platform/shared-types";

export interface IActivity extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  activityType: string;
  description: string;
  metadata: Record<string, any>;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    entityType: {
      type: String,
      required: true,
      enum: [...ENTITY_TYPES],
    },
    entityId: { type: String, required: true },
    activityType: {
      type: String,
      required: true,
      enum: [...ACTIVITY_TYPES],
    },
    description: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    performedBy: { type: String, ref: "User", required: true },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
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

ActivitySchema.index({ workspaceId: 1, createdAt: -1 });
ActivitySchema.index({ workspaceId: 1, performedBy: 1, createdAt: -1 });
ActivitySchema.index({
  workspaceId: 1,
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

export const Activity =
  mongoose.models?.Activity ||
  mongoose.model<IActivity>("Activity", ActivitySchema);
