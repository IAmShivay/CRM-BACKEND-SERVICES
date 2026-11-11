import mongoose, { Schema, Document } from "mongoose";
import { CONTACT_CATEGORIES, CONTACT_STATUSES, LEAD_PRIORITIES, MILESTONE_TYPES, MILESTONE_STATUSES } from "@crm-platform/shared-types";

export interface IContact extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  totalRevenue?: number;
  totalPayments?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  milestones?: Array<{
    title: string;
    description?: string;
    date: Date;
    type: "payment" | "meeting" | "contract" | "delivery" | "other";
    amount?: number;
    status: "completed" | "pending" | "cancelled";
  }>;
  website?: string;
  linkedIn?: string;
  twitter?: string;
  originalLeadId?: string;
  convertedFromLead?: boolean;
  leadConversionDate?: Date;
  customData?: Record<string, any>;
  tagIds?: string[];
  category?: "client" | "prospect" | "partner" | "vendor" | "other";
  assignedTo?: string;
  accountManager?: string;
  status: "active" | "inactive" | "archived";
  priority: "low" | "medium" | "high";
  notes?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
  createdBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: [...MILESTONE_TYPES],
      default: "other",
    },
    amount: { type: Number },
    status: {
      type: String,
      enum: [...MILESTONE_STATUSES],
      default: "pending",
    },
  },
  { _id: true }
);

const AddressSchema = new Schema(
  {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const ContactSchema = new Schema<IContact>(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      validate: {
        validator: function (v: string) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
    phone: { type: String, trim: true, maxlength: 20 },
    company: { type: String, trim: true, maxlength: 100 },
    position: { type: String, trim: true, maxlength: 100 },
    totalRevenue: { type: Number, min: 0, default: 0 },
    totalPayments: { type: Number, min: 0, default: 0 },
    address: AddressSchema,
    milestones: [MilestoneSchema],
    website: { type: String, trim: true, maxlength: 255 },
    linkedIn: { type: String, trim: true, maxlength: 255 },
    twitter: { type: String, trim: true, maxlength: 255 },
    originalLeadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    convertedFromLead: { type: Boolean, default: false },
    leadConversionDate: { type: Date },
    customData: { type: Schema.Types.Mixed, default: {} },
    tagIds: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    category: {
      type: String,
      enum: [...CONTACT_CATEGORIES],
      default: "prospect",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    accountManager: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: [...CONTACT_STATUSES],
      default: "active",
    },
    priority: {
      type: String,
      enum: [...LEAD_PRIORITIES],
      default: "medium",
    },
    notes: { type: String, maxlength: 2000 },
    lastContactDate: { type: Date },
    nextFollowUpDate: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

ContactSchema.index({ workspaceId: 1, name: 1 });
ContactSchema.index({ workspaceId: 1, email: 1 });
ContactSchema.index({ workspaceId: 1, company: 1 });
ContactSchema.index({ workspaceId: 1, status: 1 });
ContactSchema.index({ workspaceId: 1, assignedTo: 1 });
ContactSchema.index({ workspaceId: 1, createdAt: -1 });
ContactSchema.index({ originalLeadId: 1 });
ContactSchema.index(
  { name: "text", email: "text", company: "text", phone: "text" },
  { weights: { name: 10, email: 5, company: 3, phone: 1 } }
);

export const Contact =
  mongoose.models.Contact ||
  mongoose.model<IContact>("Contact", ContactSchema);
