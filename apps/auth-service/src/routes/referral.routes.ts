import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  emailSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import {
  getReferralCode,
  createReferral,
  getReferrals,
  getReferralStats,
  validateReferralCode,
} from "../controllers/referralController";

const referralQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const referralsListSchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
});

const createReferralSchema = z.object({
  workspaceId: workspaceIdSchema,
  email: emailSchema,
});

const router = Router();

router.get("/code", verifyToken, validateQuery(referralQuerySchema), getReferralCode);
router.get("/", verifyToken, validateQuery(referralsListSchema), getReferrals);
router.get("/stats", verifyToken, validateQuery(referralQuerySchema), getReferralStats);
router.post("/", verifyToken, validate(createReferralSchema), createReferral);
router.get("/validate/:code", validateReferralCode);

export default router;
