import mongoose, { Document, Schema } from "mongoose";

export interface IService extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  currency: string;
  category?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true },
    duration: { type: Number, required: true, min: 5 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    category: { type: String, trim: true },
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

ServiceSchema.index({ workspaceId: 1, isActive: 1 });

export const Service =
  mongoose.models?.Service || mongoose.model<IService>("Service", ServiceSchema);
