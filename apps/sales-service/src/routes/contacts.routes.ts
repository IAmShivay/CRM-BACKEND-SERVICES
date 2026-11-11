import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  createContactSchema,
  workspaceIdSchema,
  paginationSchema,
  searchSchema,
} from "@crm-platform/shared-types";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from "../controllers/contactsController";

const contactsQuerySchema = paginationSchema.merge(searchSchema).extend({
  workspaceId: workspaceIdSchema,
  status: z.enum(["active", "inactive", "archived"]).optional(),
  category: z.enum(["client", "prospect", "partner", "vendor", "other"]).optional(),
});

const router = Router();

router.get("/", verifyToken, requirePermission("contacts.view"), validateQuery(contactsQuerySchema), getContacts);
router.get("/:id", verifyToken, requirePermission("contacts.view"), getContactById);
router.post("/", verifyToken, requirePermission("contacts.create"), validate(createContactSchema), createContact);
router.put("/:id", verifyToken, requirePermission("contacts.edit"), updateContact);
router.delete("/:id", verifyToken, requirePermission("contacts.delete"), deleteContact);

export default router;
