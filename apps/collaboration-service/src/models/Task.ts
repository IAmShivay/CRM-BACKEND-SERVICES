import mongoose, { Document, Schema } from "mongoose";
import { TASK_STATUSES, TASK_PRIORITIES } from "@crm-platform/shared-types";

export interface ITask extends Omit<Document, "_id"> {
  _id: string;
  projectId: string;
  workspaceId: string;
  columnId?: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  tags: string[];
  dependencies: string[];
  attachments: Array<{ url: string; name: string; size: number; mimeType: string }>;
  completed: boolean;
  sprintId?: string;
  actualHours?: number;
  timeTracking: {
    isActive: boolean;
    totalTracked: number;
    sessions: Array<{ startedAt: Date; endedAt?: Date; duration?: number; userId: string }>;
    currentSessionStart?: Date;
  };
  completedAt?: Date;
  order: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    projectId: { type: String, ref: "Project", required: true },
    workspaceId: { type: String, ref: "Workspace", required: true },
    columnId: { type: String, ref: "Column" },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, trim: true },
    status: { type: String, enum: [...TASK_STATUSES], default: "todo" },
    priority: { type: String, enum: [...TASK_PRIORITIES], default: "medium" },
    assigneeId: { type: String, ref: "User" },
    dueDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    tags: [{ type: String, trim: true }],
    dependencies: [{ type: String, ref: "Task" }],
    attachments: [
      {
        url: { type: String },
        name: { type: String },
        size: { type: Number },
        mimeType: { type: String },
      },
    ],
    completed: { type: Boolean, default: false },
    sprintId: { type: String, ref: "Sprint" },
    actualHours: { type: Number, min: 0 },
    timeTracking: {
      isActive: { type: Boolean, default: false },
      totalTracked: { type: Number, default: 0 },
      sessions: [
        {
          startedAt: { type: Date, required: true },
          endedAt: { type: Date },
          duration: { type: Number },
          userId: { type: String, ref: "User", required: true },
        },
      ],
      currentSessionStart: { type: Date },
    },
    completedAt: { type: Date },
    order: { type: Number, default: 0 },
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

TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ sprintId: 1, completed: 1 });
TaskSchema.index({ workspaceId: 1, assigneeId: 1, status: 1 });
TaskSchema.index({ projectId: 1, columnId: 1, order: 1 });
TaskSchema.index({ dueDate: 1 }, { sparse: true });
TaskSchema.index({ title: "text", description: "text" });

export const Task =
  mongoose.models?.Task || mongoose.model<ITask>("Task", TaskSchema);
