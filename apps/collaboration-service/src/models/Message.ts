import mongoose, { Document, Schema } from "mongoose";
import { MESSAGE_TYPES } from "@crm-platform/shared-types";

export interface IMessage extends Omit<Document, "_id"> {
  _id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: "text" | "file" | "image";
  replyTo?: string;
  reactions: Array<{ userId: string; emoji: string }>;
  isEdited: boolean;
  readBy: string[];
  attachments: Array<{ url: string; name: string; size: number; mimeType: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    chatRoomId: { type: String, ref: "ChatRoom", required: true },
    senderId: { type: String, ref: "User", required: true },
    senderName: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: { type: String, enum: [...MESSAGE_TYPES], default: "text" },
    replyTo: { type: String, ref: "Message" },
    reactions: [
      {
        userId: { type: String, ref: "User" },
        emoji: { type: String },
      },
    ],
    isEdited: { type: Boolean, default: false },
    readBy: [{ type: String, ref: "User" }],
    attachments: [
      {
        url: { type: String },
        name: { type: String },
        size: { type: Number },
        mimeType: { type: String },
      },
    ],
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

MessageSchema.index({ chatRoomId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });

export const Message =
  mongoose.models?.Message || mongoose.model<IMessage>("Message", MessageSchema);
