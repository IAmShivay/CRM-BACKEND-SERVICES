import mongoose, { Document, Schema } from "mongoose";

export interface IDocumentVersion extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Date;
}

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    documentId: { type: String, ref: "CollabDocument", required: true },
    version: { type: Number, required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    createdBy: { type: String, ref: "User", required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

DocumentVersionSchema.index({ documentId: 1, version: -1 });

export const DocumentVersion =
  mongoose.models?.DocumentVersion || mongoose.model<IDocumentVersion>("DocumentVersion", DocumentVersionSchema);
