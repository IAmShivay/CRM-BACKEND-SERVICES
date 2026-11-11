import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
  searchSchema,
} from "@crm-platform/shared-types";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  bulkUpdateTasks,
  reorderTasks,
  startTimeTracking,
  stopTimeTracking,
  pauseTimeTracking,
  resumeTimeTracking,
} from "../controllers/taskController";

const tasksQuerySchema = paginationSchema.merge(searchSchema).extend({
  workspaceId: workspaceIdSchema,
  projectId: mongoIdSchema.optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: mongoIdSchema.optional(),
  columnId: mongoIdSchema.optional(),
});

const createTaskSchema = z.object({
  workspaceId: workspaceIdSchema,
  projectId: mongoIdSchema,
  columnId: mongoIdSchema.optional(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assigneeId: mongoIdSchema.optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(mongoIdSchema).optional(),
});

const bulkUpdateSchema = z.object({
  workspaceId: workspaceIdSchema,
  taskIds: z.array(mongoIdSchema).min(1).max(500),
  updates: z.object({
    status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    assigneeId: mongoIdSchema.optional(),
    columnId: mongoIdSchema.optional(),
  }).refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one update field is required",
  }),
});

const reorderSchema = z.object({
  tasks: z.array(z.object({
    id: mongoIdSchema,
    order: z.number().min(0),
    columnId: mongoIdSchema.optional(),
  })).min(1),
});

const router = Router();

router.get("/", verifyToken, requirePermission("tasks.view"), validateQuery(tasksQuerySchema), getTasks);
router.get("/:id", verifyToken, requirePermission("tasks.view"), getTaskById);
router.post("/", verifyToken, requirePermission("tasks.create"), validate(createTaskSchema), createTask);
router.put("/:id", verifyToken, requirePermission("tasks.edit"), updateTask);
router.patch("/:id/toggle-completion", verifyToken, requirePermission("tasks.edit"), toggleTaskCompletion);
router.delete("/:id", verifyToken, requirePermission("tasks.delete"), deleteTask);
router.post("/:id/time-tracking/start", verifyToken, requirePermission("tasks.edit"), startTimeTracking);
router.post("/:id/time-tracking/stop", verifyToken, requirePermission("tasks.edit"), stopTimeTracking);
router.post("/:id/time-tracking/pause", verifyToken, requirePermission("tasks.edit"), pauseTimeTracking);
router.post("/:id/time-tracking/resume", verifyToken, requirePermission("tasks.edit"), resumeTimeTracking);
router.post("/bulk-update", verifyToken, requirePermission("tasks.edit"), validate(bulkUpdateSchema), bulkUpdateTasks);
router.post("/reorder", verifyToken, requirePermission("tasks.edit"), validate(reorderSchema), reorderTasks);

export default router;
