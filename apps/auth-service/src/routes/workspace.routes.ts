import { Router } from "express";
import { getRoles } from "../controllers/roleController";
import { resendInvite, cancelInvite } from "../controllers/inviteController";
import { z } from "zod";
import { verifyToken } from "@crm-platform/auth-middleware";
import { validate } from "../middleware/validate";
import {
  inviteSchema,
  mongoIdSchema,
} from "@crm-platform/shared-types";
import {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  getMembers,
  inviteMember,
  updateMember,
  removeMember,
} from "../controllers/workspaceController";

const router = Router();

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
    .trim(),
  description: z.string().max(500).optional(),
  currency: z.string().default("USD"),
  timezone: z.string().default("UTC"),
  settings: z
    .object({
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
      weekStartsOn: z.number().min(0).max(6).optional(),
      language: z.string().optional(),
    })
    .optional(),
});

const updateMemberSchema = z.object({
  roleId: mongoIdSchema,
});

router.use(verifyToken);

router.get("/", getWorkspaces);
router.post("/", validate(createWorkspaceSchema), createWorkspace);
router.get("/:id", getWorkspaceById);
router.put("/:id", updateWorkspace);
router.get("/:id/members", getMembers);
router.post("/:id/invite", validate(inviteSchema), inviteMember);
router.patch("/:id/members/:memberId", validate(updateMemberSchema), updateMember);
router.delete("/:id/members/:memberId", removeMember);

router.get("/:id/roles", (req, _res, next) => { req.query.workspaceId = req.params.id; next(); }, getRoles);
router.post("/:id/invites", validate(inviteSchema), inviteMember);
router.post("/:id/invites/:inviteId/resend", resendInvite);
router.delete("/:id/invites/:inviteId", cancelInvite);

export default router;
