import mongoose from "mongoose";

const LeadFormIntegrationSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  platform: { type: String, enum: ["facebook", "instagram", "google_ads", "linkedin"], required: true },
  accountId: { type: String, required: true },
  accountName: { type: String, default: "" },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  pageId: { type: String },
  pageName: { type: String },
  adAccountId: { type: String },
  formIds: [{ type: String }],
  webhookSubscribed: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastSyncAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "leadformintegrations" });

LeadFormIntegrationSchema.index({ workspaceId: 1, platform: 1 });

export const LeadFormIntegration = mongoose.model("LeadFormIntegration", LeadFormIntegrationSchema);
