import mongoose, { Document, Schema } from "mongoose";
import { SUBSCRIPTION_STATUSES } from "@crm-platform/shared-types";

export interface ISubscription extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  cashfreeSubscriptionId?: string;
  cashfreeSubscriptionStatus?: string;
  authorizationStatus?: string;
  nextChargeAt?: Date;
  gracePeriodEnd?: Date;
  mandate?: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true, unique: true },
    planId: { type: String, ref: "Plan", required: true },
    status: {
      type: String,
      enum: [...SUBSCRIPTION_STATUSES],
      default: "active",
    },
    currentPeriodStart: { type: Date, required: true, default: Date.now },
    currentPeriodEnd: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    trialStart: { type: Date },
    trialEnd: { type: Date },
    cashfreeOrderId: { type: String },
    cashfreePaymentId: { type: String },
    cashfreeSubscriptionId: { type: String },
    cashfreeSubscriptionStatus: { type: String },
    authorizationStatus: { type: String },
    nextChargeAt: { type: Date },
    gracePeriodEnd: { type: Date },
    mandate: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed, default: {} },
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

SubscriptionSchema.index({ workspaceId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ cashfreeOrderId: 1 }, { sparse: true });
SubscriptionSchema.index({ cashfreeSubscriptionId: 1 }, { sparse: true });

export const Subscription =
  mongoose.models?.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
