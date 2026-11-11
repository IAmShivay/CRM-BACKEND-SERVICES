import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
} from "@crm-platform/shared-types";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getCommentHistory,
} from "../controllers/commentsController";

const commentsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  entityType: z.enum(["task", "project", "document"]),
  entityId: mongoIdSchema,
});

const createCommentSchema = z.object({
  workspaceId: workspaceIdSchema,
  content: z.string().min(1).max(10000),
  entityType: z.enum(["task", "project", "document"]),
  entityId: mongoIdSchema,
  parentId: mongoIdSchema.optional(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
});

const router = Router();

router.get("/", verifyToken, requirePermission("comments.view"), validateQuery(commentsQuerySchema), getComments);
router.post("/", verifyToken, requirePermission("comments.create"), validate(createCommentSchema), createComment);
router.get("/:id/history", verifyToken, getCommentHistory);
router.put("/:id", verifyToken, requirePermission("comments.edit"), validate(updateCommentSchema), updateComment);
router.delete("/:id", verifyToken, requirePermission("comments.delete"), deleteComment);

export default router;
