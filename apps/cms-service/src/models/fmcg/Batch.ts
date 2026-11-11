import mongoose, { Document, Schema } from "mongoose";
import { FMCG_BATCH_STATUSES } from "@crm-platform/shared-types";

export interface IFmcgBatch extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  productId: string;
  batchNumber: string;
  manufacturingDate: Date;
  expiryDate: Date;
  quantity: number;
  unitOfMeasure: string;
  supplierId?: string;
  rawMaterialLots: string[];
  status: "pending" | "approved" | "rejected" | "recalled";
  qualityCheckPassed: boolean;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FmcgBatchSchema = new Schema<IFmcgBatch>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    productId: { type: String, ref: "FmcgProduct", required: true },
    batchNumber: { type: String, required: true, trim: true },
    manufacturingDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitOfMeasure: { type: String, required: true },
    supplierId: { type: String, ref: "FmcgSupplier" },
    rawMaterialLots: [{ type: String }],
    status: { type: String, enum: [...FMCG_BATCH_STATUSES], default: "pending" },
    qualityCheckPassed: { type: Boolean, default: false },
    notes: { type: String },
    createdBy: { type: String, ref: "User", required: true },
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

FmcgBatchSchema.index({ workspaceId: 1, batchNumber: 1 }, { unique: true });
FmcgBatchSchema.index({ workspaceId: 1, productId: 1 });
FmcgBatchSchema.index({ expiryDate: 1 });

export const FmcgBatch =
  mongoose.models?.FmcgBatch || mongoose.model<IFmcgBatch>("FmcgBatch", FmcgBatchSchema);
