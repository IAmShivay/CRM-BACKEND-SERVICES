import mongoose from "mongoose";

const ComplianceTaskSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["llp_mca", "gst", "tds", "income_tax", "fssai", "trademark", "banking", "other"], required: true },
  dueDate: { type: Date },
  financialYear: { type: String },
  period: { type: String },
  status: { type: String, enum: ["pending", "completed", "overdue", "not_applicable"], default: "pending" },
  completedDate: { type: Date },
  referenceNumber: { type: String },
  amount: { type: Number },
  notes: { type: String, default: "" },
  reminderDays: { type: Number, default: 7 },
  isRecurring: { type: Boolean, default: false },
  recurringFrequency: { type: String, enum: ["monthly", "quarterly", "annual", null] },
  portalUrl: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true, toJSON: { transform: (_doc: any, ret: any) => { ret.id = ret._id; delete ret._id; delete ret.__v; return ret; } }, collection: "compliancetasks" });

ComplianceTaskSchema.index({ workspaceId: 1, dueDate: 1 });

export const ComplianceTask = mongoose.model("ComplianceTask", ComplianceTaskSchema);
