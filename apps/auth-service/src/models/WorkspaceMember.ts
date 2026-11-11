import mongoose, { Document, Schema } from "mongoose";
import { WORKSPACE_MEMBER_STATUSES } from "@crm-platform/shared-types";

export interface IWorkspaceMember extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  status: string;
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: {
      type: String,
      ref: "Workspace",
      required: true,
    },
    userId: {
      type: String,
      ref: "User",
      required: true,
    },
    roleId: {
      type: String,
      ref: "Role",
      required: true,
    },
    status: {
      type: String,
      enum: [...WORKSPACE_MEMBER_STATUSES],
      default: "active",
    },
    invitedBy: {
      type: String,
      ref: "User",
    },
    invitedAt: {
      type: Date,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
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

WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
WorkspaceMemberSchema.index({ userId: 1, status: 1 });

export const WorkspaceMember =
  mongoose.models?.WorkspaceMember ||
  mongoose.model<IWorkspaceMember>("WorkspaceMember", WorkspaceMemberSchema);
