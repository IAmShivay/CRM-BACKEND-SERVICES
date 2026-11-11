import mongoose, { Document, Schema } from "mongoose";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES, APPOINTMENT_SOURCES, REMINDER_TYPES, REMINDER_STATUSES, RECURRING_FREQUENCIES } from "@crm-platform/shared-types";

export interface IAppointment extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  serviceId?: string;
  serviceName: string;
  contactId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  assignedTo?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status:
    | "scheduled"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show";
  type: "scheduled" | "walk_in";
  isRecurring: boolean;
  recurringRule?: {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };
  parentAppointmentId?: string;
  price: number;
  currency: string;
  notes?: string;
  internalNotes?: string;
  cancelReason?: string;
  source: "manual" | "online" | "phone" | "whatsapp";
  reminders: Array<{
    type: "email" | "sms" | "whatsapp";
    scheduledFor: Date;
    sentAt?: Date;
    status: "pending" | "sent" | "failed";
  }>;
  location?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema(
  {
    type: {
      type: String,
      enum: [...REMINDER_TYPES],
      required: true,
    },
    scheduledFor: { type: Date, required: true },
    sentAt: { type: Date },
    status: {
      type: String,
      enum: [...REMINDER_STATUSES],
      default: "pending",
    },
  },
  { _id: false }
);

const RecurringRuleSchema = new Schema(
  {
    frequency: {
      type: String,
      enum: [...RECURRING_FREQUENCIES],
      required: true,
    },
    interval: { type: Number, default: 1, min: 1 },
    endDate: { type: Date },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
  },
  { _id: false }
);

const AppointmentSchema = new Schema<IAppointment>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    serviceId: { type: String, ref: "Service" },
    serviceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    contactId: { type: String, ref: "Contact" },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true, maxlength: 20 },
    assignedTo: { type: String, ref: "User" },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true, min: 5 },
    status: {
      type: String,
      enum: [...APPOINTMENT_STATUSES],
      default: "scheduled",
    },
    type: {
      type: String,
      enum: [...APPOINTMENT_TYPES],
      default: "scheduled",
    },
    isRecurring: { type: Boolean, default: false },
    recurringRule: RecurringRuleSchema,
    parentAppointmentId: { type: String, ref: "Appointment" },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR", trim: true, maxlength: 5 },
    notes: { type: String, trim: true, maxlength: 2000 },
    internalNotes: { type: String, trim: true, maxlength: 1000 },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    source: {
      type: String,
      enum: [...APPOINTMENT_SOURCES],
      default: "manual",
    },
    reminders: [ReminderSchema],
    location: { type: String, trim: true, maxlength: 200 },
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

AppointmentSchema.index({ workspaceId: 1, startTime: 1, endTime: 1 });
AppointmentSchema.index({ workspaceId: 1, assignedTo: 1, startTime: 1 });
AppointmentSchema.index({ workspaceId: 1, status: 1, startTime: 1 });
AppointmentSchema.index({ workspaceId: 1, contactId: 1 });
AppointmentSchema.index({ workspaceId: 1, customerPhone: 1 });
AppointmentSchema.index({
  customerName: "text",
  customerEmail: "text",
  customerPhone: "text",
});

export const Appointment =
  mongoose.models?.Appointment ||
  mongoose.model<IAppointment>("Appointment", AppointmentSchema);
