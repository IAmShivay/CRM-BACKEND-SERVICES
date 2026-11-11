import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validateQuery } from "../middleware/validate";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import {
  getPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getStages,
  createStage,
  updateStage,
  deleteStage,
} from "../controllers/pipelineController";

const workspaceQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, requirePermission("deals.view"), validateQuery(workspaceQuerySchema), getPipelines);
router.get("/:id", verifyToken, requirePermission("deals.view"), getPipelineById);
router.post("/", verifyToken, requirePermission("deals.create"), createPipeline);
router.put("/:id", verifyToken, requirePermission("deals.edit"), updatePipeline);
router.delete("/:id", verifyToken, requirePermission("deals.delete"), deletePipeline);
router.get("/:id/stages", verifyToken, requirePermission("deals.view"), getStages);
router.post("/:id/stages", verifyToken, requirePermission("deals.create"), createStage);
router.put("/:id/stages/:stageId", verifyToken, requirePermission("deals.edit"), updateStage);
router.delete("/:id/stages/:stageId", verifyToken, requirePermission("deals.delete"), deleteStage);

export default router;
