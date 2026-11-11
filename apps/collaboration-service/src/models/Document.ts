import mongoose, { Document as MongoDocument, Schema } from "mongoose";

export interface IDocument extends Omit<MongoDocument, "_id"> {
  _id: string;
  workspaceId: string;
  title: string;
  content: string;
  folderId?: string;
  createdBy: string;
  sharedWith: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: String, default: "" },
    folderId: { type: String },
    createdBy: { type: String, ref: "User", required: true },
    sharedWith: [{ type: String, ref: "User" }],
    version: { type: Number, default: 1 },
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

DocumentSchema.index({ workspaceId: 1, createdBy: 1 });
DocumentSchema.index({ workspaceId: 1, folderId: 1 });
DocumentSchema.index({ title: "text", content: "text" });

export const CollabDocument =
  mongoose.models?.CollabDocument || mongoose.model<IDocument>("CollabDocument", DocumentSchema);
