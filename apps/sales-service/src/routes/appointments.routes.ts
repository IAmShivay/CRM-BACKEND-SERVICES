import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  appointmentSchema,
  workspaceIdSchema,
  paginationSchema,
  APPOINTMENT_STATUSES,
} from "@crm-platform/shared-types";
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentAnalytics,
} from "../controllers/appointmentController";

const appointmentsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const createAppointmentSchema = appointmentSchema.extend({
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  location: z.string().max(200).optional(),
});

const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  cancelReason: z.string().max(500).optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("leads.view"), validateQuery(appointmentsQuerySchema), getAppointments);
router.get("/analytics", verifyToken, requirePermission("leads.view"), getAppointmentAnalytics);
router.get("/:id", verifyToken, requirePermission("leads.view"), getAppointmentById);
router.post("/", verifyToken, requirePermission("leads.create"), validate(createAppointmentSchema), createAppointment);
router.put("/:id", verifyToken, requirePermission("leads.edit"), validate(updateAppointmentSchema), updateAppointment);
router.delete("/:id", verifyToken, requirePermission("leads.delete"), deleteAppointment);

export default router;
