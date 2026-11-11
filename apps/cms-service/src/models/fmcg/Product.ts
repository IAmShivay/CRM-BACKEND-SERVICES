import mongoose, { Document, Schema } from "mongoose";

export interface IFmcgProduct extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  ingredients: string[];
  allergens: string[];
  nutritionalInfo: Record<string, any>;
  shelfLifeDays: number;
  storageTemp: { min: number; max: number };
  regulatoryApprovals: string[];
  barcode?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FmcgProductSchema = new Schema<IFmcgProduct>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    ingredients: [{ type: String }],
    allergens: [{ type: String }],
    nutritionalInfo: { type: Schema.Types.Mixed, default: {} },
    shelfLifeDays: { type: Number, required: true, min: 1 },
    storageTemp: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    regulatoryApprovals: [{ type: String }],
    barcode: { type: String },
    isActive: { type: Boolean, default: true },
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

FmcgProductSchema.index({ workspaceId: 1, sku: 1 }, { unique: true });
FmcgProductSchema.index({ workspaceId: 1, category: 1 });
FmcgProductSchema.index({ name: "text" });

export const FmcgProduct =
  mongoose.models?.FmcgProduct || mongoose.model<IFmcgProduct>("FmcgProduct", FmcgProductSchema);
