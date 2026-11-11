import mongoose, { Document, Schema } from "mongoose";
import { CHAT_ROOM_TYPES } from "@crm-platform/shared-types";

export interface IChatRoom extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  type: "general" | "private" | "direct";
  participants: string[];
  settings: Record<string, any>;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema = new Schema<IChatRoom>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: [...CHAT_ROOM_TYPES], default: "general" },
    participants: [{ type: String, ref: "User" }],
    settings: { type: Schema.Types.Mixed, default: {} },
    isArchived: { type: Boolean, default: false },
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

ChatRoomSchema.index({ workspaceId: 1, type: 1 });
ChatRoomSchema.index({ workspaceId: 1, participants: 1 });

export const ChatRoom =
  mongoose.models?.ChatRoom || mongoose.model<IChatRoom>("ChatRoom", ChatRoomSchema);
