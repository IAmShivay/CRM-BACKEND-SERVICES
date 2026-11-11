import mongoose, { Document, Schema } from "mongoose";

export interface IPipeline extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  currency: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineSchema = new Schema<IPipeline>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    currency: { type: String, default: "INR", trim: true, maxlength: 5 },
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

PipelineSchema.index({ workspaceId: 1, isActive: 1 });
PipelineSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Pipeline =
  mongoose.models?.Pipeline ||
  mongoose.model<IPipeline>("Pipeline", PipelineSchema);
