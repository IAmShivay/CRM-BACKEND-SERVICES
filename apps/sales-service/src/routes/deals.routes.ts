import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission, verifyInternalKey } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  createDealSchema,
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import {
  getDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  moveDealStage,
  wonDeal,
  lostDeal,
  getDealAnalytics,
  createDealFromLead,
  getDealActivities,
} from "../controllers/dealsController";

const dealsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  leadId: z.string().optional(),
});

const fromLeadSchema = z.object({
  leadId: mongoIdSchema,
});

const moveDealStageSchema = z.object({
  stageId: mongoIdSchema,
  stageName: z.string().optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("deals.view"), validateQuery(dealsQuerySchema), getDeals);
router.post("/internal/from-lead", verifyInternalKey, validate(fromLeadSchema), createDealFromLead);
router.get("/analytics", verifyToken, requirePermission("deals.view"), validateQuery(z.object({ workspaceId: z.string() })), getDealAnalytics);
router.get("/:id/activities", verifyToken, requirePermission("deals.view"), getDealActivities);
router.get("/:id", verifyToken, requirePermission("deals.view"), getDealById);
router.post("/", verifyToken, requirePermission("deals.create"), validate(createDealSchema), createDeal);
router.put("/:id", verifyToken, requirePermission("deals.edit"), updateDeal);
router.delete("/:id", verifyToken, requirePermission("deals.delete"), deleteDeal);
router.put("/:id/won", verifyToken, requirePermission("deals.edit"), wonDeal);
router.put("/:id/lost", verifyToken, requirePermission("deals.edit"), lostDeal);
router.post("/:id/move-stage", verifyToken, requirePermission("deals.edit"), validate(moveDealStageSchema), moveDealStage);

export default router;
