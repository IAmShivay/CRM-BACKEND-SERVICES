import mongoose, { Document, Schema } from "mongoose";

export interface IPushSubscription extends Omit<Document, "_id"> {
  _id: string;
  userId: string;
  workspaceId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: String, ref: "User", required: true },
    workspaceId: { type: String, ref: "Workspace", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

PushSubscriptionSchema.index({ userId: 1, workspaceId: 1 });

export const PushSubscription =
  mongoose.models?.PushSubscription || mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
