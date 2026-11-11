import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
} from "@crm-platform/shared-types";
import {
  getOnboardingStatus,
  updateOnboardingStep,
  skipOnboarding,
} from "../controllers/onboardingController";

const onboardingQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const updateStepSchema = z.object({
  workspaceId: workspaceIdSchema,
  step: z.enum([
    "profileCompleted",
    "workspaceConfigured",
    "teamInvited",
    "firstLeadCreated",
    "pipelineConfigured",
    "integrationConnected",
  ]),
  completed: z.boolean(),
});

const skipSchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, validateQuery(onboardingQuerySchema), getOnboardingStatus);
router.put("/step", verifyToken, validate(updateStepSchema), updateOnboardingStep);
router.post("/skip", verifyToken, validate(skipSchema), skipOnboarding);

export default router;
