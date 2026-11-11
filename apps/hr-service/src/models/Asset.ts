import mongoose, { Schema } from "mongoose";
import { ASSET_TYPES, ASSET_CONDITION, ASSET_STATUS, ASSET_DOCUMENT_TYPES, DEPRECIATION_METHODS } from "@crm-platform/shared-types";

const assetSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: [...ASSET_TYPES],
      index: true,
    },
    subcategory: { type: String, trim: true },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    serialNumber: { type: String, required: true, trim: true, unique: true, index: true },
    assetTag: { type: String, unique: true, sparse: true, index: true },
    purchaseDate: { type: Date, required: true, index: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    vendor: {
      name: String,
      contact: String,
      email: String,
    },
    condition: {
      type: String,
      required: true,
      enum: [...ASSET_CONDITION],
      default: "excellent",
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: [...ASSET_STATUS],
      default: "available",
      index: true,
    },
    location: { type: String, required: true, trim: true, index: true },
    department: { type: String, trim: true, index: true },
    warranty: {
      provider: { type: String, trim: true },
      startDate: Date,
      expiryDate: Date,
      terms: String,
    },
    specifications: { type: Map, of: String, default: {} },
    images: [
      {
        url: String,
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    documents: [
      {
        type: { type: String, enum: [...ASSET_DOCUMENT_TYPES] },
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    depreciation: {
      method: { type: String, enum: [...DEPRECIATION_METHODS], default: "straight_line" },
      usefulLife: { type: Number, min: 1 },
      salvageValue: { type: Number, min: 0, default: 0 },
    },
    insurance: {
      provider: String,
      policyNumber: String,
      coverage: Number,
      expiryDate: Date,
    },
    qrCode: { type: String, sparse: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    collection: "assets",
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

assetSchema.index({ workspaceId: 1, category: 1 });
assetSchema.index({ workspaceId: 1, status: 1 });
assetSchema.index({ workspaceId: 1, location: 1 });
assetSchema.index({ workspaceId: 1, department: 1 });
assetSchema.index({ brand: 1, model: 1 });
assetSchema.index({ name: "text", brand: "text", model: "text", serialNumber: "text", assetTag: "text" });

export const Asset =
  mongoose.models.Asset || mongoose.model("Asset", assetSchema);
