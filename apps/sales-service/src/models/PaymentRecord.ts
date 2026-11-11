import mongoose, { Document, Schema } from "mongoose";
import { PAYMENT_METHODS } from "@crm-platform/shared-types";

export interface IPaymentRecord extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  invoiceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  referenceNumber?: string;
  notes?: string;
  receivedBy: string;
  createdAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    invoiceId: { type: String, ref: "Invoice", required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: { type: String, enum: [...PAYMENT_METHODS], default: "upi" },
    referenceNumber: { type: String, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 500 },
    receivedBy: { type: String, ref: "User", required: true },
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

PaymentRecordSchema.index({ invoiceId: 1, createdAt: -1 });
PaymentRecordSchema.index({ workspaceId: 1, paymentDate: -1 });

export const PaymentRecord =
  mongoose.models?.PaymentRecord || mongoose.model<IPaymentRecord>("PaymentRecord", PaymentRecordSchema);
