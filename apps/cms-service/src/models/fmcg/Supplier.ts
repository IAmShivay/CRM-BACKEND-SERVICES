import mongoose, { Document, Schema } from "mongoose";

export interface IFmcgSupplier extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  address?: string;
  certifications: string[];
  rating: number;
  isApproved: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FmcgSupplierSchema = new Schema<IFmcgSupplier>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    contactPerson: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    certifications: [{ type: String }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    isApproved: { type: Boolean, default: false },
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

FmcgSupplierSchema.index({ workspaceId: 1 });
FmcgSupplierSchema.index({ name: "text" });

export const FmcgSupplier =
  mongoose.models?.FmcgSupplier || mongoose.model<IFmcgSupplier>("FmcgSupplier", FmcgSupplierSchema);
