import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  createLeadSchema,
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
  searchSchema,
  dateRangeSchema,
} from "@crm-platform/shared-types";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  bulkUpdateLeads,
  convertLeadToContact,
  getLeadNotes,
  addLeadNote,
  getLeadActivities,
  addLeadActivity,
} from "../controllers/leadsController";

const leadsQuerySchema = paginationSchema.merge(searchSchema).merge(dateRangeSchema).extend({
  workspaceId: workspaceIdSchema,
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  source: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  tags: z.string().optional(),
});

const bulkDeleteSchema = z.object({
  workspaceId: workspaceIdSchema,
  ids: z.array(mongoIdSchema).min(1).max(500),
});

const bulkUpdateSchema = z.object({
  workspaceId: workspaceIdSchema,
  leadIds: z.array(mongoIdSchema).min(1).max(500),
  updates: z.object({
    statusId: mongoIdSchema.optional(),
    assignedTo: mongoIdSchema.optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    source: z.string().optional(),
  }).refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one update field is required",
  }),
});

const addNoteSchema = z.object({
  content: z.string().min(1),
  type: z.enum(["note", "call", "email", "meeting"]).default("note"),
  isPrivate: z.boolean().default(false),
  createdBy: mongoIdSchema.optional(),
});

const addActivitySchema = z.object({
  activityType: z.string().min(1),
  description: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  performedBy: mongoIdSchema.optional(),
});

const activityQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, requirePermission("leads.view"), validateQuery(leadsQuerySchema), getLeads);
router.get("/:id", verifyToken, requirePermission("leads.view"), getLeadById);
router.post("/", verifyToken, requirePermission("leads.create"), validate(createLeadSchema), createLead);
router.put("/:id", verifyToken, requirePermission("leads.edit"), updateLead);
router.delete("/:id", verifyToken, requirePermission("leads.delete"), deleteLead);
router.post("/bulk-delete", verifyToken, requirePermission("leads.delete"), validate(bulkDeleteSchema), bulkDeleteLeads);
router.post("/bulk-update", verifyToken, requirePermission("leads.edit"), validate(bulkUpdateSchema), bulkUpdateLeads);
router.post("/:id/convert", verifyToken, requirePermission("leads.edit"), convertLeadToContact);
router.get("/:id/notes", verifyToken, requirePermission("leads.view"), getLeadNotes);
router.post("/:id/notes", verifyToken, requirePermission("leads.edit"), validate(addNoteSchema), addLeadNote);
router.get("/:id/activities", verifyToken, requirePermission("leads.view"), getLeadActivities);
router.post("/:id/activities", verifyToken, requirePermission("leads.edit"), validateQuery(activityQuerySchema), validate(addActivitySchema), addLeadActivity);

export default router;
