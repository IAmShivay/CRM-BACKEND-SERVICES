import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validateQuery } from "../middleware/validate";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import {
  getLeadStatuses,
  createLeadStatus,
  updateLeadStatus,
  deleteLeadStatus,
} from "../controllers/leadStatusController";

const workspaceQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, requirePermission("leads.view"), validateQuery(workspaceQuerySchema), getLeadStatuses);
router.post("/", verifyToken, requirePermission("leads.create"), createLeadStatus);
router.put("/:id", verifyToken, requirePermission("leads.edit"), updateLeadStatus);
router.delete("/:id", verifyToken, requirePermission("leads.delete"), deleteLeadStatus);

export default router;
