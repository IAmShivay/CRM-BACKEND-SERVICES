import mongoose, { Document, Schema } from "mongoose";

export interface IColumn extends Omit<Document, "_id"> {
  _id: string;
  projectId: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ColumnSchema = new Schema<IColumn>(
  {
    projectId: { type: String, ref: "Project", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    color: { type: String, default: "#6366f1" },
    order: { type: Number, default: 0 },
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

ColumnSchema.index({ projectId: 1, order: 1 });

export const Column =
  mongoose.models?.Column || mongoose.model<IColumn>("Column", ColumnSchema);
