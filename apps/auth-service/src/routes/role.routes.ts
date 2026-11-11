import { Router } from "express";
import { z } from "zod";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import { verifyToken } from "@crm-platform/auth-middleware";
import { validate } from "../middleware/validate";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getRoleById,
} from "../controllers/roleController";

const router = Router({ mergeParams: true });

const createRoleSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/),
  description: z.string().max(255).optional(),
  permissions: z.array(z.string()).min(1),
});

router.use(verifyToken);

router.get("/", getRoles);
router.get("/:roleId", getRoleById);
router.post("/", validate(createRoleSchema), createRole);
router.put("/:roleId", updateRole);
router.delete("/:roleId", deleteRole);

export default router;
