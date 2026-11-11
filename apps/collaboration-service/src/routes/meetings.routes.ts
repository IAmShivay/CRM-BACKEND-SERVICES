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
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  joinMeeting,
  endMeeting,
  inviteToMeeting,
} from "../controllers/meetingController";

const meetingsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
});

const createMeetingSchema = z.object({
  workspaceId: workspaceIdSchema,
  title: z.string().min(1).max(200),
  type: z.enum(["instant", "scheduled"]).default("scheduled"),
  chatRoomId: mongoIdSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  participantIds: z.array(mongoIdSchema).optional(),
  duration: z.number().min(0).optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("meetings.view"), validateQuery(meetingsQuerySchema), getMeetings);
router.get("/:id", verifyToken, requirePermission("meetings.view"), getMeetingById);
router.post("/", verifyToken, requirePermission("meetings.create"), validate(createMeetingSchema), createMeeting);
router.put("/:id", verifyToken, requirePermission("meetings.edit"), updateMeeting);
router.delete("/:id", verifyToken, requirePermission("meetings.delete"), deleteMeeting);
router.post("/:id/join", verifyToken, requirePermission("meetings.view"), joinMeeting);
router.post("/:id/invite", verifyToken, inviteToMeeting);
router.post("/:id/end", verifyToken, requirePermission("meetings.edit"), endMeeting);

export default router;
