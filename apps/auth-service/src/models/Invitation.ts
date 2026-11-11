import mongoose, { Document, Schema } from "mongoose";
import { INVITATION_STATUSES } from "@crm-platform/shared-types";

export interface IInvitation extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  email: string;
  roleId: string;
  invitedBy: string;
  token: string;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    workspaceId: {
      type: String,
      ref: "Workspace",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    roleId: {
      type: String,
      ref: "Role",
      required: true,
    },
    invitedBy: {
      type: String,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: [...INVITATION_STATUSES],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    acceptedAt: {
      type: Date,
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

InvitationSchema.index({ workspaceId: 1, status: 1 });
InvitationSchema.index({ email: 1, status: 1 });
InvitationSchema.index({ expiresAt: 1 });

export const Invitation =
  mongoose.models?.Invitation ||
  mongoose.model<IInvitation>("Invitation", InvitationSchema);
