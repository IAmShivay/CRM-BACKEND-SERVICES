import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
  INVOICE_STATUSES,
  INVOICE_TYPES,
  DISCOUNT_TYPES,
  INVOICE_SEND_CHANNELS,
  RECURRING_INTERVALS,
  PAYMENT_METHODS,
} from "@crm-platform/shared-types";
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  recordPayment,
  sendInvoice,
  getInvoiceAnalytics,
  getNextInvoiceNumber,
} from "../controllers/invoiceController";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

const bankDetailsSchema = z.object({
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
});

const invoiceItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  hsnSac: z.string().max(20).optional(),
  quantity: z.number().min(0),
  unit: z.string().max(20).optional(),
  rate: z.number().min(0),
  discount: z.number().min(0).optional(),
  discountType: z.enum(DISCOUNT_TYPES).optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

const invoicesQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  status: z.string().optional(),
  type: z.string().optional(),
  contactId: mongoIdSchema.optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const createInvoiceSchema = z.object({
  workspaceId: workspaceIdSchema,
  type: z.enum(INVOICE_TYPES).optional(),
  contactId: mongoIdSchema.optional(),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(20).optional(),
  customerGstin: z.string().max(15).optional(),
  customerAddress: addressSchema.optional(),
  sellerName: z.string().optional(),
  sellerGstin: z.string().max(15).optional(),
  sellerAddress: addressSchema.optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  currency: z.string().max(5).optional(),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().optional(),
  paymentTerms: z.string().max(500).optional(),
  bankDetails: bankDetailsSchema.optional(),
  dealId: mongoIdSchema.optional(),
  quoteId: mongoIdSchema.optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  isRecurring: z.boolean().optional(),
  recurringInterval: z.enum(RECURRING_INTERVALS).optional(),
});

const updateInvoiceSchema = z.object({
  workspaceId: workspaceIdSchema,
  status: z.enum(INVOICE_STATUSES).optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(20).optional(),
  customerGstin: z.string().max(15).optional(),
  customerAddress: addressSchema.optional(),
  sellerName: z.string().optional(),
  sellerGstin: z.string().max(15).optional(),
  sellerAddress: addressSchema.optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  items: z.array(invoiceItemSchema).min(1).optional(),
  placeOfSupply: z.string().optional(),
  reverseCharge: z.boolean().optional(),
  paymentTerms: z.string().max(500).optional(),
  bankDetails: bankDetailsSchema.optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().max(2000).optional(),
  termsAndConditions: z.string().max(5000).optional(),
  internalNotes: z.string().max(1000).optional(),
});

const recordPaymentSchema = z.object({
  workspaceId: workspaceIdSchema,
  amount: z.number().min(0.01),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

const sendInvoiceSchema = z.object({
  workspaceId: workspaceIdSchema,
  channel: z.enum(INVOICE_SEND_CHANNELS).optional(),
});

const analyticsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const nextNumberQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  type: z.enum(INVOICE_TYPES).optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("invoices.view"), validateQuery(invoicesQuerySchema), getInvoices);
router.get("/next-number", verifyToken, requirePermission("invoices.view"), validateQuery(nextNumberQuerySchema), getNextInvoiceNumber);
router.get("/analytics", verifyToken, requirePermission("invoices.view"), validateQuery(analyticsQuerySchema), getInvoiceAnalytics);
router.get("/:id", verifyToken, requirePermission("invoices.view"), getInvoiceById);
router.post("/", verifyToken, requirePermission("invoices.create"), validate(createInvoiceSchema), createInvoice);
router.put("/:id", verifyToken, requirePermission("invoices.edit"), validate(updateInvoiceSchema), updateInvoice);
router.delete("/:id", verifyToken, requirePermission("invoices.delete"), deleteInvoice);
router.post("/:id/record-payment", verifyToken, requirePermission("invoices.edit"), validate(recordPaymentSchema), recordPayment);
router.post("/:id/send", verifyToken, requirePermission("invoices.edit"), validate(sendInvoiceSchema), sendInvoice);

export default router;
