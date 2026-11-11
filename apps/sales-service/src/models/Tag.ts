import mongoose, { Document, Schema } from "mongoose";

export interface ITag extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  color: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-F]{6}$/i,
      default: "#3b82f6",
    },
    description: { type: String, trim: true, maxlength: 200 },
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

TagSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const Tag =
  mongoose.models?.Tag || mongoose.model<ITag>("Tag", TagSchema);
