import mongoose, { Document, Schema } from "mongoose";
import { NOTIFICATION_TYPES, NOTIFICATION_LEVELS } from "@crm-platform/shared-types";

export interface INotification extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  notificationLevel: "personal" | "team" | "workspace";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    userId: { type: String, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: [...NOTIFICATION_TYPES], default: "info" },
    entityType: { type: String },
    entityId: { type: String },
    isRead: { type: Boolean, default: false },
    notificationLevel: { type: String, enum: [...NOTIFICATION_LEVELS], default: NOTIFICATION_LEVELS[0] },
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

NotificationSchema.index({ workspaceId: 1, userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification =
  mongoose.models?.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
