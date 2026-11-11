import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import { getActivities, createActivity } from "../controllers/activitiesController";

const activitiesQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("leads.view"), validateQuery(activitiesQuerySchema), getActivities);
router.post("/", verifyToken, requirePermission("leads.edit"), createActivity);

export default router;
