import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission, verifyInternalKey } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import { createOrder } from "../controllers/orderController";
import { verifyPayment } from "../controllers/verifyController";
import { getSubscription, cancelSubscription, verifySubscription, getPaymentHistory } from "../controllers/subscriptionController";
import { getUsage, checkLimit } from "../controllers/usageController";
import { handleCashfreeWebhook } from "../controllers/webhookController";
import { getPlans, getPlanById, createPlan, updatePlan } from "../controllers/planController";

const createOrderSchema = z.object({
  planId: z.string().min(1),
  workspaceId: workspaceIdSchema,
});

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  workspaceId: workspaceIdSchema,
  planId: z.string().min(1).optional(),
});

const cancelSubscriptionSchema = z.object({
  workspaceId: workspaceIdSchema,
});

const verifySubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  workspaceId: workspaceIdSchema,
});

const subscriptionQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.post("/payments/create-order", verifyToken, requirePermission("billing.edit"), validate(createOrderSchema), createOrder);
router.post("/payments/verify", verifyToken, requirePermission("billing.edit"), validate(verifyPaymentSchema), verifyPayment);
router.get("/payments/subscription", verifyToken, requirePermission("billing.view"), validateQuery(subscriptionQuerySchema), getSubscription);
router.post("/payments/cancel", verifyToken, requirePermission("billing.edit"), validate(cancelSubscriptionSchema), cancelSubscription);
router.post("/payments/subscriptions/verify", verifyToken, requirePermission("billing.edit"), validate(verifySubscriptionSchema), verifySubscription);
router.get("/payments/history", verifyToken, requirePermission("billing.view"), validateQuery(subscriptionQuerySchema), getPaymentHistory);

router.get("/payments/usage", verifyToken, getUsage);
router.get("/payments/internal/limits", verifyInternalKey, checkLimit);
router.post("/webhooks/cashfree", handleCashfreeWebhook);

router.get("/plans", verifyToken, getPlans);
router.get("/plans/:id", verifyToken, getPlanById);
router.post("/plans", verifyToken, requirePermission("billing.edit"), createPlan);
router.put("/plans/:id", verifyToken, requirePermission("billing.edit"), updatePlan);

export default router;
