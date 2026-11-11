import mongoose, { Document, Schema } from "mongoose";
import { STOCK_MOVEMENT_TYPES } from "@crm-platform/shared-types";

export interface IProduct extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  sku: string;
  description?: string;
  category?: string;
  unitPrice: number;
  costPrice: number;
  currency: string;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  isActive: boolean;
  movements: Array<{
    type: "in" | "out" | "adjustment";
    quantity: number;
    reference?: string;
    date: Date;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    unit: { type: String, default: "pcs" },
    isActive: { type: Boolean, default: true },
    movements: [
      {
        type: { type: String, enum: [...STOCK_MOVEMENT_TYPES], required: true },
        quantity: { type: Number, required: true },
        reference: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
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

ProductSchema.index({ workspaceId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ workspaceId: 1, category: 1 });
ProductSchema.index({ name: "text", sku: "text" });

export const Product =
  mongoose.models?.Product || mongoose.model<IProduct>("Product", ProductSchema);
