import mongoose, { Document, Schema } from "mongoose";
import { SPRINT_STATUSES } from "@crm-platform/shared-types";

export interface ISprint extends Omit<Document, "_id"> {
  _id: string;
  projectId: string;
  workspaceId: string;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: "planning" | "active" | "completed";
  taskIds: string[];
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>(
  {
    projectId: { type: String, ref: "Project", required: true },
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    goal: { type: String, trim: true, maxlength: 1000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: [...SPRINT_STATUSES], default: "planning" },
    taskIds: [{ type: String, ref: "Task" }],
    completedAt: { type: Date },
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

SprintSchema.index({ projectId: 1, status: 1 });
SprintSchema.index({ workspaceId: 1 });

export const Sprint =
  mongoose.models?.Sprint || mongoose.model<ISprint>("Sprint", SprintSchema);
