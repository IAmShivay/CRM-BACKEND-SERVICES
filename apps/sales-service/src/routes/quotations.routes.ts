import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  acceptQuotation,
  rejectQuotation,
  convertToInvoice,
  sendQuotation,
} from "../controllers/quotationController";

const quotationsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  status: z.string().optional(),
  contactId: mongoIdSchema.optional(),
});

const createQuotationSchema = z.object({
  workspaceId: workspaceIdSchema,
  quotationNumber: z.string().min(1),
  contactId: mongoIdSchema.optional(),
  dealId: mongoIdSchema.optional(),
  items: z.array(z.object({
    productId: mongoIdSchema.optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    tax: z.number().min(0).default(0),
    total: z.number().min(0),
  })).min(1),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  currency: z.string().default("INR"),
  validUntil: z.string().datetime(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("quotations.view"), validateQuery(quotationsQuerySchema), getQuotations);
router.get("/:id", verifyToken, requirePermission("quotations.view"), getQuotationById);
router.post("/", verifyToken, requirePermission("quotations.create"), validate(createQuotationSchema), createQuotation);
router.put("/:id", verifyToken, requirePermission("quotations.edit"), updateQuotation);
router.delete("/:id", verifyToken, requirePermission("quotations.delete"), deleteQuotation);
router.post("/:id/accept", verifyToken, requirePermission("quotations.edit"), acceptQuotation);
router.post("/:id/reject", verifyToken, requirePermission("quotations.edit"), rejectQuotation);
router.post("/:id/convert-to-invoice", verifyToken, requirePermission("quotations.edit"), convertToInvoice);
router.post("/:id/send", verifyToken, requirePermission("quotations.edit"), sendQuotation);

export default router;
