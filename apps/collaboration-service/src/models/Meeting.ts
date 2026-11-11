import mongoose, { Document, Schema } from "mongoose";
import { MEETING_TYPES, MEETING_STATUSES } from "@crm-platform/shared-types";

export interface IMeeting extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  title: string;
  type: "instant" | "scheduled";
  chatRoomId?: string;
  scheduledAt?: Date;
  participantIds: string[];
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  jitsiRoomId?: string;
  duration?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    type: { type: String, enum: [...MEETING_TYPES], default: "scheduled" },
    chatRoomId: { type: String, ref: "ChatRoom" },
    scheduledAt: { type: Date },
    participantIds: [{ type: String, ref: "User" }],
    status: { type: String, enum: [...MEETING_STATUSES], default: "scheduled" },
    jitsiRoomId: { type: String },
    duration: { type: Number, min: 0 },
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

MeetingSchema.index({ workspaceId: 1, scheduledAt: 1 });
MeetingSchema.index({ workspaceId: 1, participantIds: 1 });

export const Meeting =
  mongoose.models?.Meeting || mongoose.model<IMeeting>("Meeting", MeetingSchema);
