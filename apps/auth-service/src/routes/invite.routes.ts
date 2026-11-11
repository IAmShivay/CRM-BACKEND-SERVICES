import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "@crm-platform/auth-middleware";
import { validate } from "../middleware/validate";
import {
  getInvites,
  resendInvite,
  cancelInvite,
  acceptInvite,
  validateInvite,
  declineInvite,
  acceptWithRegistration,
} from "../controllers/inviteController";

const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

const router = Router({ mergeParams: true });

router.post("/accept", validate(acceptInviteSchema), acceptInvite);

const tokenSchema = z.object({ token: z.string().min(1) });
const acceptWithRegistrationSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

router.post("/validate", validate(tokenSchema), validateInvite);
router.post("/decline", validate(tokenSchema), declineInvite);
router.post("/accept-with-registration", validate(acceptWithRegistrationSchema), acceptWithRegistration);

router.use(verifyToken);

router.get("/", getInvites);
router.post("/:inviteId/resend", resendInvite);
router.post("/:inviteId/cancel", cancelInvite);

export default router;
