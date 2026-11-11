import mongoose, { Document, Schema } from "mongoose";
import { CONVERSATION_MODES, CONVERSATION_STATUSES } from "@crm-platform/shared-types";

export interface IWhatsAppConversation extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  accountId: string;
  contactPhone: string;
  contactName?: string;
  mode: "ai" | "human" | "workflow" | "idle";
  humanAssignedTo?: string;
  aiEnabled: boolean;
  activeWorkflowId?: string;
  status: "active" | "closed" | "archived";
  lastInboundAt?: Date;
  lastOutboundAt?: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppConversationSchema = new Schema<IWhatsAppConversation>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    accountId: { type: String, ref: "WhatsAppAccount", required: true },
    contactPhone: { type: String, required: true, trim: true, maxlength: 20 },
    contactName: { type: String, trim: true, maxlength: 200 },
    mode: { type: String, enum: [...CONVERSATION_MODES], default: "idle" },
    humanAssignedTo: { type: String, ref: "User" },
    aiEnabled: { type: Boolean, default: false },
    activeWorkflowId: { type: String },
    status: { type: String, enum: [...CONVERSATION_STATUSES], default: "active" },
    lastInboundAt: { type: Date },
    lastOutboundAt: { type: Date },
    lastMessagePreview: { type: String, trim: true, maxlength: 200 },
    unreadCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
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

WhatsAppConversationSchema.index({ workspaceId: 1, accountId: 1, contactPhone: 1 }, { unique: true });
WhatsAppConversationSchema.index({ workspaceId: 1, mode: 1, status: 1 });
WhatsAppConversationSchema.index({ workspaceId: 1, humanAssignedTo: 1 });

export const WhatsAppConversation =
  mongoose.models?.WhatsAppConversation ||
  mongoose.model<IWhatsAppConversation>("WhatsAppConversation", WhatsAppConversationSchema);
