import mongoose, { Document, Schema } from "mongoose";
import { PROJECT_INVITATION_STATUSES, PROJECT_JOIN_REQUEST_STATUSES } from "@crm-platform/shared-types";

export interface IProjectInvitation extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  projectId: string;
  inviteeEmail: string;
  inviteeId?: string;
  inviterId: string;
  roleId: string;
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  expiresAt: Date;
  message?: string;
  acceptedAt?: Date;
  declinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectJoinRequest extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  requesterId: string;
  status: "pending" | "approved" | "denied";
  message?: string;
  approvedBy?: string;
  approvedAt?: Date;
  deniedBy?: string;
  deniedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const toJSON = {
  transform: function (_doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.token;
    return ret;
  },
};

const ProjectInvitationSchema = new Schema<IProjectInvitation>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    projectId: { type: String, ref: "Project", required: true },
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true },
    inviteeId: { type: String, ref: "User" },
    inviterId: { type: String, ref: "User", required: true },
    roleId: { type: String, ref: "Role", required: true },
    status: { type: String, enum: [...PROJECT_INVITATION_STATUSES], default: "pending" },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    acceptedAt: { type: Date },
    declinedAt: { type: Date },
  },
  { timestamps: true, toJSON }
);

ProjectInvitationSchema.index({ projectId: 1, status: 1 });
ProjectInvitationSchema.index({ inviteeEmail: 1, status: 1 });

const ProjectJoinRequestSchema = new Schema<IProjectJoinRequest>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    projectId: { type: String, ref: "Project", required: true },
    userId: { type: String, ref: "User", required: true },
    requesterId: { type: String, ref: "User", required: true },
    status: { type: String, enum: [...PROJECT_JOIN_REQUEST_STATUSES], default: "pending" },
    message: { type: String, trim: true, maxlength: 1000 },
    approvedBy: { type: String, ref: "User" },
    approvedAt: { type: Date },
    deniedBy: { type: String, ref: "User" },
    deniedAt: { type: Date },
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

ProjectJoinRequestSchema.index({ projectId: 1, status: 1 });
ProjectJoinRequestSchema.index({ projectId: 1, userId: 1 });

export const ProjectInvitation =
  mongoose.models?.ProjectInvitation || mongoose.model<IProjectInvitation>("ProjectInvitation", ProjectInvitationSchema);

export const ProjectJoinRequest =
  mongoose.models?.ProjectJoinRequest || mongoose.model<IProjectJoinRequest>("ProjectJoinRequest", ProjectJoinRequestSchema);
