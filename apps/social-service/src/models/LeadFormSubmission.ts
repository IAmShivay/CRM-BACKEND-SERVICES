import mongoose from "mongoose";

const LeadFormSubmissionSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  integrationId: { type: mongoose.Schema.Types.ObjectId, ref: "LeadFormIntegration", required: true },
  platform: { type: String, enum: ["facebook", "instagram", "google_ads", "linkedin"], required: true },
  formId: { type: String },
  formName: { type: String },
  externalLeadId: { type: String },
  fieldData: [{ name: String, value: String }],
  rawPayload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ["pending", "processed", "failed", "skipped"], default: "pending" },
  processedAt: { type: Date },
  crmLeadId: { type: String },
  error: { type: String },
}, { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "leadformsubmissions" });

LeadFormSubmissionSchema.index({ workspaceId: 1, status: 1 });
LeadFormSubmissionSchema.index({ externalLeadId: 1 }, { unique: true, sparse: true });

export const LeadFormSubmission = mongoose.model("LeadFormSubmission", LeadFormSubmissionSchema);
