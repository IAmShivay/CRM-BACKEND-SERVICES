import mongoose, { Document, Schema } from "mongoose";

export interface IPipelineStage extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  pipelineId: string;
  name: string;
  color: string;
  order: number;
  probability: number;
  isWonStage: boolean;
  isLostStage: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PipelineStageSchema = new Schema<IPipelineStage>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    pipelineId: { type: String, ref: "Pipeline", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    color: { type: String, default: "#6366f1", match: /^#[0-9A-Fa-f]{6}$/ },
    order: { type: Number, required: true, min: 0 },
    probability: { type: Number, default: 0, min: 0, max: 100 },
    isWonStage: { type: Boolean, default: false },
    isLostStage: { type: Boolean, default: false },
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

PipelineStageSchema.index({ pipelineId: 1, order: 1 });
PipelineStageSchema.index({ workspaceId: 1, pipelineId: 1 });
PipelineStageSchema.index({ pipelineId: 1, name: 1 }, { unique: true });

export const PipelineStage =
  mongoose.models?.PipelineStage ||
  mongoose.model<IPipelineStage>("PipelineStage", PipelineStageSchema);
