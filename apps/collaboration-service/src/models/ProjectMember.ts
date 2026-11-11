import mongoose, { Document, Schema } from "mongoose";
import { PROJECT_MEMBER_STATUSES } from "@crm-platform/shared-types";

export interface IProjectMember extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  roleId: string;
  status: "pending" | "active" | "inactive" | "removed";
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  removedAt?: Date;
  removedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    projectId: { type: String, ref: "Project", required: true },
    userId: { type: String, ref: "User", required: true },
    roleId: { type: String, ref: "Role", required: true },
    status: { type: String, enum: [...PROJECT_MEMBER_STATUSES], default: "active" },
    invitedBy: { type: String, ref: "User" },
    invitedAt: { type: Date },
    joinedAt: { type: Date, default: Date.now },
    removedAt: { type: Date },
    removedBy: { type: String, ref: "User" },
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

ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
ProjectMemberSchema.index({ projectId: 1, status: 1 });
ProjectMemberSchema.index({ workspaceId: 1, userId: 1 });

export const ProjectMember =
  mongoose.models?.ProjectMember || mongoose.model<IProjectMember>("ProjectMember", ProjectMemberSchema);
