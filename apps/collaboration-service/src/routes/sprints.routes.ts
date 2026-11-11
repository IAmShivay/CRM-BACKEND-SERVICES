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
  getSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  startSprint,
  completeSprint,
} from "../controllers/sprintController";

const sprintsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  projectId: mongoIdSchema.optional(),
  status: z.enum(["planning", "active", "completed"]).optional(),
});

const createSprintSchema = z.object({
  workspaceId: workspaceIdSchema,
  projectId: mongoIdSchema,
  name: z.string().min(1).max(200),
  goal: z.string().max(1000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(["planning", "active", "completed"]).default("planning"),
  taskIds: z.array(mongoIdSchema).optional(),
});

const addTaskSchema = z.object({
  taskId: mongoIdSchema,
});

const completeSprintSchema = z.object({
  moveIncompleteTo: z.string().min(1),
});

const router = Router();

router.post("/:id/start", verifyToken, requirePermission("projects.edit"), startSprint);
router.post("/:id/complete", verifyToken, requirePermission("projects.edit"), validate(completeSprintSchema), completeSprint);

router.get("/", verifyToken, requirePermission("projects.view"), validateQuery(sprintsQuerySchema), getSprints);
router.get("/:id", verifyToken, requirePermission("projects.view"), getSprintById);
router.post("/", verifyToken, requirePermission("projects.create"), validate(createSprintSchema), createSprint);
router.put("/:id", verifyToken, requirePermission("projects.edit"), updateSprint);
router.delete("/:id", verifyToken, requirePermission("projects.delete"), deleteSprint);
router.post("/:id/tasks", verifyToken, requirePermission("projects.edit"), validate(addTaskSchema), addTaskToSprint);
router.delete("/:id/tasks/:taskId", verifyToken, requirePermission("projects.edit"), removeTaskFromSprint);

export default router;
