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
  getCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  respondToEvent,
} from "../controllers/calendarController";

const calendarQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const createEventSchema = z.object({
  workspaceId: workspaceIdSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  allDay: z.boolean().default(false),
  attendees: z.array(z.object({
    userId: mongoIdSchema,
    status: z.enum(["pending", "accepted", "declined"]).default("pending"),
  })).optional(),
  location: z.string().optional(),
  color: z.string().optional(),
  recurrence: z.string().optional(),
});

const respondSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

const router = Router();

router.get("/events", verifyToken, requirePermission("calendar.view"), validateQuery(calendarQuerySchema), getCalendarEvents);
router.get("/events/:id", verifyToken, requirePermission("calendar.view"), getCalendarEventById);
router.post("/events", verifyToken, requirePermission("calendar.create"), validate(createEventSchema), createCalendarEvent);
router.put("/events/:id", verifyToken, requirePermission("calendar.edit"), updateCalendarEvent);
router.delete("/events/:id", verifyToken, requirePermission("calendar.delete"), deleteCalendarEvent);
router.post("/events/:id/respond", verifyToken, requirePermission("calendar.view"), validate(respondSchema), respondToEvent);

export default router;
