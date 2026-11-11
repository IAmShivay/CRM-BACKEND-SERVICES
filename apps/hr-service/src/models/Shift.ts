import mongoose, { Document, Schema } from "mongoose";
import { WORK_TYPES } from "@crm-platform/shared-types";

export interface IShift extends Document {
  name: string;
  workspaceId: mongoose.Types.ObjectId;
  startTime: string;
  endTime: string;
  breakDuration: number;
  workingDays: number[];
  totalHours: number;
  isFlexible: boolean;
  graceTime: number;
  isDefault: boolean;
  isActive: boolean;
  timezone: string;
  createdBy: mongoose.Types.ObjectId;
  description?: string;
  color: string;
  allowedWorkTypes: string[];
  overtimeRules: {
    allowOvertime: boolean;
    maxOvertimeHours: number;
    overtimeMultiplier: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema = new Schema<IShift>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Start time must be in HH:MM format",
      },
    },
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "End time must be in HH:MM format",
      },
    },
    breakDuration: { type: Number, default: 60, min: 0, max: 480 },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: {
        validator: function (days: number[]) {
          return days.every((day) => day >= 0 && day <= 6);
        },
        message: "Working days must be numbers between 0 and 6",
      },
    },
    totalHours: { type: Number, required: true, min: 1, max: 24 },
    isFlexible: { type: Boolean, default: false },
    graceTime: { type: Number, default: 15, min: 0, max: 120 },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    timezone: { type: String, default: "UTC" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, trim: true, maxlength: 500 },
    color: {
      type: String,
      default: "#3B82F6",
      validate: {
        validator: function (v: string) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color code",
      },
    },
    allowedWorkTypes: {
      type: [String],
      enum: [...WORK_TYPES],
      default: ["office", "remote"],
    },
    overtimeRules: {
      allowOvertime: { type: Boolean, default: true },
      maxOvertimeHours: { type: Number, default: 4, min: 0, max: 12 },
      overtimeMultiplier: { type: Number, default: 1.5, min: 1, max: 3 },
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ShiftSchema.index({ workspaceId: 1, isActive: 1 });
ShiftSchema.index({ workspaceId: 1, isDefault: 1 });

export const Shift =
  mongoose.models.Shift || mongoose.model<IShift>("Shift", ShiftSchema);
