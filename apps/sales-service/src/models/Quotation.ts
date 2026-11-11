import mongoose, { Document, Schema } from "mongoose";
import { QUOTATION_STATUSES } from "@crm-platform/shared-types";

export interface IQuotation extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  quotationNumber: string;
  contactId?: string;
  dealId?: string;
  items: Array<{
    productId?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    tax: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
  validUntil: Date;
  notes?: string;
  terms?: string;
  sentAt?: Date;
  convertedToInvoiceId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationSchema = new Schema<IQuotation>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    quotationNumber: { type: String, required: true, trim: true },
    contactId: { type: String, ref: "Contact" },
    dealId: { type: String, ref: "Deal" },
    items: [
      {
        productId: { type: String, ref: "Product" },
        name: { type: String, required: true },
        description: { type: String },
        quantity: { type: Number, required: true, min: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        tax: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: [...QUOTATION_STATUSES], default: "draft" },
    validUntil: { type: Date, required: true },
    notes: { type: String },
    terms: { type: String },
    sentAt: { type: Date },
    convertedToInvoiceId: { type: String, ref: "Invoice" },
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

QuotationSchema.index({ workspaceId: 1, quotationNumber: 1 }, { unique: true });
QuotationSchema.index({ workspaceId: 1, status: 1 });
QuotationSchema.index({ workspaceId: 1, contactId: 1 });

export const Quotation =
  mongoose.models?.Quotation || mongoose.model<IQuotation>("Quotation", QuotationSchema);
