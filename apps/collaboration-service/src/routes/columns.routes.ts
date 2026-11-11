import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
} from "@crm-platform/shared-types";
import {
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from "../controllers/columnController";

const columnsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  projectId: mongoIdSchema,
});

const createColumnSchema = z.object({
  workspaceId: workspaceIdSchema,
  projectId: mongoIdSchema,
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

const reorderColumnsSchema = z.object({
  columns: z.array(z.object({
    id: mongoIdSchema,
    order: z.number().min(0),
  })).min(1),
});

const router = Router();

router.get("/", verifyToken, requirePermission("projects.view"), validateQuery(columnsQuerySchema), getColumns);
router.post("/", verifyToken, requirePermission("projects.create"), validate(createColumnSchema), createColumn);
router.put("/:id", verifyToken, requirePermission("projects.edit"), updateColumn);
router.delete("/:id", verifyToken, requirePermission("projects.delete"), deleteColumn);
router.post("/reorder", verifyToken, requirePermission("projects.edit"), validate(reorderColumnsSchema), reorderColumns);

export default router;
