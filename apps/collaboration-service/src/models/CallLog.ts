import mongoose from "mongoose";

const CallLogSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  callId: { type: String },
  direction: { type: String, enum: ["inbound", "outbound"], default: "outbound" },
  from: { type: String },
  to: { type: String, required: true },
  status: { type: String, enum: ["initiated", "ringing", "answered", "completed", "failed", "missed"], default: "initiated" },
  duration: { type: Number, default: 0 },
  leadId: { type: mongoose.Schema.Types.ObjectId },
  contactId: { type: mongoose.Schema.Types.ObjectId },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "calllogs" });

CallLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const CallLog = mongoose.model("CallLog", CallLogSchema);
