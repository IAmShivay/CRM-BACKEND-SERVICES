import mongoose, { Document, Schema } from "mongoose";
import { ATTENDANCE_CLOCK_STATUSES, WORK_TYPES } from "@crm-platform/shared-types";

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  breakStart?: Date;
  breakEnd?: Date;
  totalBreakTime: number;
  totalWorkTime?: number;
  status: "clocked_in" | "on_break" | "clocked_out" | "absent" | "late" | "half_day";
  location?: {
    clockInLocation?: { latitude: number; longitude: number; address?: string };
    clockOutLocation?: { latitude: number; longitude: number; address?: string };
  };
  notes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  isApproved: boolean;
  overtime: boolean;
  overtimeMinutes: number;
  workType: "office" | "remote" | "hybrid" | "field";
  ip?: string;
  device?: string;
  browser?: string;
  regularHours: number;
  isHoliday: boolean;
  isWeekend: boolean;
  shiftId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    date: { type: Date, required: true, index: true },
    clockIn: { type: Date, required: true, index: true },
    clockOut: { type: Date, index: true },
    breakStart: { type: Date },
    breakEnd: { type: Date },
    totalBreakTime: { type: Number, default: 0, min: 0 },
    totalWorkTime: { type: Number, min: 0 },
    status: {
      type: String,
      enum: [...ATTENDANCE_CLOCK_STATUSES],
      default: "clocked_in",
      index: true,
    },
    location: {
      clockInLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
      },
      clockOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
      },
    },
    notes: { type: String, trim: true, maxlength: 500 },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isApproved: { type: Boolean, default: false, index: true },
    overtime: { type: Boolean, default: false, index: true },
    overtimeMinutes: { type: Number, default: 0, min: 0 },
    workType: {
      type: String,
      enum: [...WORK_TYPES],
      default: "office",
      index: true,
    },
    ip: { type: String },
    device: { type: String },
    browser: { type: String },
    regularHours: { type: Number, default: 8, min: 0, max: 24 },
    isHoliday: { type: Boolean, default: false, index: true },
    isWeekend: { type: Boolean, default: false, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: "Shift" },
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

AttendanceSchema.index({ workspaceId: 1, date: -1, status: 1 });
AttendanceSchema.index({ userId: 1, workspaceId: 1, date: -1 }, { unique: true });

export const Attendance =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
