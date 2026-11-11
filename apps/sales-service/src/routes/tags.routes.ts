import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validateQuery } from "../middleware/validate";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import { getTags, createTag, updateTag, deleteTag } from "../controllers/tagController";

const workspaceQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, requirePermission("leads.view"), validateQuery(workspaceQuerySchema), getTags);
router.post("/", verifyToken, requirePermission("leads.create"), createTag);
router.put("/:id", verifyToken, requirePermission("leads.edit"), updateTag);
router.delete("/:id", verifyToken, requirePermission("leads.delete"), deleteTag);

export default router;
