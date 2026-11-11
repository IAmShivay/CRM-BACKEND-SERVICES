import mongoose from "mongoose";

const ComplianceDocumentSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ["license", "registration", "filing", "agreement", "certificate", "tax_return", "audit_report", "bank", "dsc", "other"], required: true },
  documentNumber: { type: String, default: "" },
  issuedBy: { type: String, default: "" },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  status: { type: String, enum: ["valid", "expiring_soon", "expired", "archived"], default: "valid" },
  documentUrl: { type: String, default: "" },
  retentionYears: { type: Number },
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "compliancedocuments" });

ComplianceDocumentSchema.index({ workspaceId: 1, expiryDate: 1 });

export const ComplianceDocument = mongoose.model("ComplianceDocument", ComplianceDocumentSchema);
