import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validateQuery } from "../middleware/validate";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import { startOAuth, oauthCallback, getConnections, disconnect } from "../controllers/oauthConnectionController";

const connectionsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  provider: z.enum(["linkedin", "meta"]).optional(),
});

const disconnectQuerySchema = z.object({
  id: z.string().min(1),
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/connections", verifyToken, requirePermission("leads.view"), validateQuery(connectionsQuerySchema), getConnections);
router.delete("/connections", verifyToken, requirePermission("leads.edit"), validateQuery(disconnectQuerySchema), disconnect);
router.get("/:provider/callback", oauthCallback);
router.get("/:provider", verifyToken, requirePermission("leads.edit"), startOAuth);

export default router;
