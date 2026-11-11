import mongoose, { Document, Schema } from "mongoose";
import { DEFAULT_PLAN_CURRENCY, PLAN_INTERVALS } from "@crm-platform/shared-types";

export interface IPlan extends Omit<Document, "_id"> {
  _id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: Record<string, number>;
  sortOrder: number;
  isActive: boolean;
  cashfreePlanId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 255 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_PLAN_CURRENCY, uppercase: true, trim: true },
    interval: { type: String, enum: [...PLAN_INTERVALS], required: true },
    features: [{ type: String, trim: true }],
    limits: { type: Schema.Types.Mixed, default: {} },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    cashfreePlanId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc: any, ret: any) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

PlanSchema.index({ isActive: 1, sortOrder: 1 });

export const Plan =
  mongoose.models?.Plan || mongoose.model<IPlan>("Plan", PlanSchema);
