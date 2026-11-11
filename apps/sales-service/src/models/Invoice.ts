import mongoose, { Document, Schema } from "mongoose";
import {
  INVOICE_STATUSES,
  INVOICE_TYPES,
  DISCOUNT_TYPES,
  INVOICE_SEND_CHANNELS,
  RECURRING_INTERVALS,
  DEFAULT_GST_RATE,
  DEFAULT_ITEM_UNIT,
  DEFAULT_CURRENCY,
} from "@crm-platform/shared-types";

export interface IInvoiceItem {
  name: string;
  description?: string;
  hsnSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  discountType: (typeof DISCOUNT_TYPES)[number];
  taxRate: number;
  taxAmount: number;
  amount: number;
}

export interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface IBankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface IInvoice extends Omit<Document, "_id"> {
  _id: string;
  workspaceId: string;
  invoiceNumber: string;
  type: (typeof INVOICE_TYPES)[number];
  status: (typeof INVOICE_STATUSES)[number];
  contactId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerGstin?: string;
  customerAddress?: IAddress;
  sellerName?: string;
  sellerGstin?: string;
  sellerAddress?: IAddress;
  invoiceDate: Date;
  dueDate?: Date;
  paidDate?: Date;
  items: IInvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  placeOfSupply?: string;
  isInterState: boolean;
  reverseCharge: boolean;
  eWayBillNumber?: string;
  paymentTerms?: string;
  bankDetails?: IBankDetails;
  dealId?: string;
  quoteId?: string;
  referenceNumber?: string;
  notes?: string;
  termsAndConditions?: string;
  internalNotes?: string;
  isRecurring: boolean;
  recurringInterval?: (typeof RECURRING_INTERVALS)[number];
  nextRecurringDate?: Date;
  parentInvoiceId?: string;
  pdfUrl?: string;
  sentAt?: Date;
  viewedAt?: Date;
  reminders: Array<{ sentAt: Date; channel: (typeof INVOICE_SEND_CHANNELS)[number] }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    hsnSac: { type: String, trim: true, maxlength: 20 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: DEFAULT_ITEM_UNIT, trim: true, maxlength: 20 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: [...DISCOUNT_TYPES], default: "percentage" },
    taxRate: { type: Number, default: DEFAULT_GST_RATE, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false }
);

const BankDetailsSchema = new Schema(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    upiId: { type: String, trim: true },
  },
  { _id: false }
);

const ReminderSchema = new Schema(
  {
    sentAt: { type: Date, required: true },
    channel: { type: String, enum: [...INVOICE_SEND_CHANNELS], required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    invoiceNumber: { type: String, required: true, trim: true, maxlength: 50 },
    type: { type: String, enum: [...INVOICE_TYPES], default: "tax_invoice" },
    status: { type: String, enum: [...INVOICE_STATUSES], default: "draft" },
    contactId: { type: String, ref: "Contact" },
    customerName: { type: String, required: true, trim: true, maxlength: 200 },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true },
    customerGstin: { type: String, trim: true, maxlength: 15 },
    customerAddress: AddressSchema,
    sellerName: { type: String, trim: true },
    sellerGstin: { type: String, trim: true, maxlength: 15 },
    sellerAddress: AddressSchema,
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    paidDate: { type: Date },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, default: 0, min: 0 },
    totalDiscount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, default: 0, min: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    amountDue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY, trim: true, maxlength: 5 },
    placeOfSupply: { type: String, trim: true, maxlength: 50 },
    isInterState: { type: Boolean, default: false },
    reverseCharge: { type: Boolean, default: false },
    eWayBillNumber: { type: String, trim: true },
    paymentTerms: { type: String, trim: true, maxlength: 500 },
    bankDetails: BankDetailsSchema,
    dealId: { type: String, ref: "Deal" },
    quoteId: { type: String },
    referenceNumber: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    termsAndConditions: { type: String, trim: true, maxlength: 5000 },
    internalNotes: { type: String, trim: true, maxlength: 1000 },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: [...RECURRING_INTERVALS] },
    nextRecurringDate: { type: Date },
    parentInvoiceId: { type: String, ref: "Invoice" },
    pdfUrl: { type: String },
    sentAt: { type: Date },
    viewedAt: { type: Date },
    reminders: [ReminderSchema],
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

InvoiceSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ workspaceId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ workspaceId: 1, contactId: 1 });
InvoiceSchema.index({ workspaceId: 1, dueDate: 1, status: 1 });
InvoiceSchema.index({ workspaceId: 1, type: 1 });
InvoiceSchema.index({ workspaceId: 1, dealId: 1 });
InvoiceSchema.index({ isRecurring: 1, nextRecurringDate: 1 });
InvoiceSchema.index(
  { customerName: "text", invoiceNumber: "text", customerEmail: "text" },
  { weights: { invoiceNumber: 10, customerName: 5, customerEmail: 1 } }
);

export const Invoice =
  mongoose.models?.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);
