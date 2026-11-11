import mongoose, { Schema } from "mongoose";
import { LEAVE_REQUEST_TYPES, LEAVE_STATUSES } from "@crm-platform/shared-types";

const leaveRequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    leavePolicyId: { type: Schema.Types.ObjectId, ref: "LeavePolicy" },
    leaveType: {
      type: String,
      required: true,
      enum: [...LEAVE_REQUEST_TYPES],
    },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    totalDays: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: [...LEAVE_STATUSES],
      default: "pending",
      index: true,
    },
    appliedDate: { type: Date, default: Date.now, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedDate: { type: Date },
    rejectionReason: { type: String, trim: true },
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    handoverDetails: {
      handoverTo: { type: Schema.Types.ObjectId, ref: "User" },
      tasks: String,
      notes: String,
    },
  },
  {
    timestamps: true,
    collection: "leave_requests",
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

leaveRequestSchema.index({ workspaceId: 1, employeeId: 1 });
leaveRequestSchema.index({ workspaceId: 1, status: 1 });
leaveRequestSchema.index({ workspaceId: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ employeeId: 1, status: 1, startDate: 1 });

export const LeaveRequest =
  mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveRequestSchema);
