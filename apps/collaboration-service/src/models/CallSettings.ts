import mongoose from "mongoose";

const CallSettingsSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  provider: { type: String, enum: ["telecmi", "exotel", "custom"], default: "telecmi" },
  apiKey: { type: String, default: "" },
  apiSecret: { type: String, default: "" },
  callerId: { type: String, default: "" },
  webhookUrl: { type: String, default: "" },
  isActive: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "callsettings" });

CallSettingsSchema.index({ workspaceId: 1 }, { unique: true });

export const CallSettings = mongoose.model("CallSettings", CallSettingsSchema);
