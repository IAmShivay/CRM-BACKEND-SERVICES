import mongoose, { Document, Schema } from "mongoose";
import { PROJECT_STATUSES, PROJECT_VISIBILITY } from "@crm-platform/shared-types";

export interface IProject extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  status: "active" | "completed" | "archived" | "on_hold";
  visibility: (typeof PROJECT_VISIBILITY)[number];
  startDate?: Date;
  endDate?: Date;
  settings: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: [...PROJECT_STATUSES], default: "active" },
    visibility: { type: String, enum: [...PROJECT_VISIBILITY], default: "workspace" },
    startDate: { type: Date },
    endDate: { type: Date },
    settings: { type: Schema.Types.Mixed, default: {} },
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

ProjectSchema.index({ workspaceId: 1, status: 1 });
ProjectSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
ProjectSchema.index({ name: "text", description: "text" });

export const Project =
  mongoose.models?.Project || mongoose.model<IProject>("Project", ProjectSchema);
