import mongoose, { Document, Schema } from "mongoose";
import { FMCG_COMPLAINT_STATUSES, FMCG_COMPLAINT_SEVERITY, TEST_RESULTS, RECALL_SEVERITY, RECALL_STATUSES, LICENSE_STATUSES } from "@crm-platform/shared-types";

export interface IRMLot extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  supplierId: string;
  materialName: string;
  lotNumber: string;
  receivedDate: Date;
  expiryDate: Date;
  quantity: number;
  unit: string;
  inspectionPassed: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RMLotSchema = new Schema<IRMLot>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    supplierId: { type: String, ref: "FmcgSupplier", required: true },
    materialName: { type: String, required: true, trim: true },
    lotNumber: { type: String, required: true, trim: true },
    receivedDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    inspectionPassed: { type: Boolean, default: false },
    createdBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

RMLotSchema.index({ workspaceId: 1, lotNumber: 1 });

export const RMLot = mongoose.models?.RMLot || mongoose.model<IRMLot>("RMLot", RMLotSchema);

export interface ITestReport extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  batchId: string;
  testType: string;
  testDate: Date;
  result: "pass" | "fail" | "pending";
  parameters: Record<string, any>;
  testedBy: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestReportSchema = new Schema<ITestReport>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    batchId: { type: String, ref: "FmcgBatch", required: true },
    testType: { type: String, required: true },
    testDate: { type: Date, required: true },
    result: { type: String, enum: [...TEST_RESULTS], default: TEST_RESULTS[2] },
    parameters: { type: Schema.Types.Mixed, default: {} },
    testedBy: { type: String, ref: "User", required: true },
    notes: { type: String },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

TestReportSchema.index({ workspaceId: 1, batchId: 1 });

export const TestReport = mongoose.models?.TestReport || mongoose.model<ITestReport>("TestReport", TestReportSchema);

export interface ITemperatureLog extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  location: string;
  temperature: number;
  humidity?: number;
  recordedAt: Date;
  recordedBy: string;
  isWithinRange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemperatureLogSchema = new Schema<ITemperatureLog>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    location: { type: String, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number },
    recordedAt: { type: Date, required: true },
    recordedBy: { type: String, ref: "User", required: true },
    isWithinRange: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

TemperatureLogSchema.index({ workspaceId: 1, location: 1, recordedAt: -1 });

export const TemperatureLog = mongoose.models?.TemperatureLog || mongoose.model<ITemperatureLog>("TemperatureLog", TemperatureLogSchema);

export interface ICleaningLog extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  area: string;
  cleanedAt: Date;
  cleanedBy: string;
  method: string;
  chemicals: string[];
  verified: boolean;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CleaningLogSchema = new Schema<ICleaningLog>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    area: { type: String, required: true },
    cleanedAt: { type: Date, required: true },
    cleanedBy: { type: String, ref: "User", required: true },
    method: { type: String, required: true },
    chemicals: [{ type: String }],
    verified: { type: Boolean, default: false },
    verifiedBy: { type: String, ref: "User" },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

CleaningLogSchema.index({ workspaceId: 1, cleanedAt: -1 });

export const CleaningLog = mongoose.models?.CleaningLog || mongoose.model<ICleaningLog>("CleaningLog", CleaningLogSchema);

export interface ICalibrationLog extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  equipment: string;
  calibratedAt: Date;
  calibratedBy: string;
  nextDueDate: Date;
  result: "pass" | "fail";
  certificate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalibrationLogSchema = new Schema<ICalibrationLog>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    equipment: { type: String, required: true },
    calibratedAt: { type: Date, required: true },
    calibratedBy: { type: String, ref: "User", required: true },
    nextDueDate: { type: Date, required: true },
    result: { type: String, enum: [...TEST_RESULTS].filter(r => r !== "pending"), required: true },
    certificate: { type: String },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

CalibrationLogSchema.index({ workspaceId: 1, nextDueDate: 1 });

export const CalibrationLog = mongoose.models?.CalibrationLog || mongoose.model<ICalibrationLog>("CalibrationLog", CalibrationLogSchema);

export interface IPestLog extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  inspectionDate: Date;
  inspector: string;
  area: string;
  findings: string;
  actionTaken?: string;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PestLogSchema = new Schema<IPestLog>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    inspectionDate: { type: Date, required: true },
    inspector: { type: String, required: true },
    area: { type: String, required: true },
    findings: { type: String, required: true },
    actionTaken: { type: String },
    followUpDate: { type: Date },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

PestLogSchema.index({ workspaceId: 1, inspectionDate: -1 });

export const PestLog = mongoose.models?.PestLog || mongoose.model<IPestLog>("PestLog", PestLogSchema);

export interface IWaterTest extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  source: string;
  testDate: Date;
  parameters: Record<string, any>;
  result: "pass" | "fail";
  testedBy: string;
  labName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WaterTestSchema = new Schema<IWaterTest>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    source: { type: String, required: true },
    testDate: { type: Date, required: true },
    parameters: { type: Schema.Types.Mixed, default: {} },
    result: { type: String, enum: [...TEST_RESULTS].filter(r => r !== "pending"), required: true },
    testedBy: { type: String, ref: "User", required: true },
    labName: { type: String },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

WaterTestSchema.index({ workspaceId: 1, testDate: -1 });

export const WaterTest = mongoose.models?.WaterTest || mongoose.model<IWaterTest>("WaterTest", WaterTestSchema);

export interface IComplaint extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  batchId?: string;
  productId?: string;
  complainant: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  resolution?: string;
  resolvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    batchId: { type: String, ref: "FmcgBatch" },
    productId: { type: String, ref: "FmcgProduct" },
    complainant: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: [...FMCG_COMPLAINT_SEVERITY], default: "medium" },
    status: { type: String, enum: [...FMCG_COMPLAINT_STATUSES], default: "open" },
    resolution: { type: String },
    resolvedAt: { type: Date },
    createdBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

ComplaintSchema.index({ workspaceId: 1, status: 1 });

export const Complaint = mongoose.models?.Complaint || mongoose.model<IComplaint>("Complaint", ComplaintSchema);

export interface IDistribution extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  batchId: string;
  destination: string;
  dispatchDate: Date;
  quantity: number;
  vehicleNumber?: string;
  driverName?: string;
  receivedBy?: string;
  receivedAt?: Date;
  temperatureOnArrival?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const DistributionSchema = new Schema<IDistribution>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    batchId: { type: String, ref: "FmcgBatch", required: true },
    destination: { type: String, required: true },
    dispatchDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 },
    vehicleNumber: { type: String },
    driverName: { type: String },
    receivedBy: { type: String },
    receivedAt: { type: Date },
    temperatureOnArrival: { type: Number },
    createdBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

DistributionSchema.index({ workspaceId: 1, batchId: 1 });

export const Distribution = mongoose.models?.Distribution || mongoose.model<IDistribution>("Distribution", DistributionSchema);

export interface IRecallEvent extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  batchIds: string[];
  productId: string;
  reason: string;
  severity: "class1" | "class2" | "class3";
  initiatedAt: Date;
  status: "initiated" | "in_progress" | "completed";
  affectedQuantity: number;
  recoveredQuantity: number;
  initiatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecallEventSchema = new Schema<IRecallEvent>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    batchIds: [{ type: String, ref: "FmcgBatch" }],
    productId: { type: String, ref: "FmcgProduct", required: true },
    reason: { type: String, required: true },
    severity: { type: String, enum: [...RECALL_SEVERITY], required: true },
    initiatedAt: { type: Date, required: true },
    status: { type: String, enum: [...RECALL_STATUSES], default: RECALL_STATUSES[0] },
    affectedQuantity: { type: Number, required: true, min: 0 },
    recoveredQuantity: { type: Number, default: 0, min: 0 },
    initiatedBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

RecallEventSchema.index({ workspaceId: 1, status: 1 });

export const RecallEvent = mongoose.models?.RecallEvent || mongoose.model<IRecallEvent>("RecallEvent", RecallEventSchema);

export interface ILicense extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  licenseNumber: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate: Date;
  status: "active" | "expired" | "renewal_pending";
  documentUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const LicenseSchema = new Schema<ILicense>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    issuedBy: { type: String, required: true },
    issuedDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: [...LICENSE_STATUSES], default: LICENSE_STATUSES[0] },
    documentUrl: { type: String },
    createdBy: { type: String, ref: "User", required: true },
  },
  { timestamps: true, toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } } }
);

LicenseSchema.index({ workspaceId: 1, expiryDate: 1 });

export const License = mongoose.models?.License || mongoose.model<ILicense>("License", LicenseSchema);
