import mongoose, { Document, Schema } from "mongoose";
import { ATTENDEE_STATUSES } from "@crm-platform/shared-types";

export interface ICalendarEvent extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  createdBy: string;
  attendees: Array<{ userId: string; status: "pending" | "accepted" | "declined" }>;
  location?: string;
  color?: string;
  recurrence?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    createdBy: { type: String, ref: "User", required: true },
    attendees: [
      {
        userId: { type: String, ref: "User" },
        status: { type: String, enum: [...ATTENDEE_STATUSES], default: ATTENDEE_STATUSES[0] },
      },
    ],
    location: { type: String, trim: true },
    color: { type: String },
    recurrence: { type: String },
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

CalendarEventSchema.index({ workspaceId: 1, startDate: 1, endDate: 1 });
CalendarEventSchema.index({ workspaceId: 1, "attendees.userId": 1 });

export const CalendarEvent =
  mongoose.models?.CalendarEvent || mongoose.model<ICalendarEvent>("CalendarEvent", CalendarEventSchema);
