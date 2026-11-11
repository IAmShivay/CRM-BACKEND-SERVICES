import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
  paginationSchema,
  searchSchema,
} from "@crm-platform/shared-types";
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  getPublicDocument,
  getDocumentVersions,
  restoreDocumentVersion,
} from "../controllers/documentController";

const documentsQuerySchema = paginationSchema.merge(searchSchema).extend({
  workspaceId: workspaceIdSchema,
  folderId: z.string().optional(),
});

const createDocumentSchema = z.object({
  workspaceId: workspaceIdSchema,
  title: z.string().min(1).max(300),
  content: z.string().optional(),
  folderId: z.string().optional(),
});

const shareDocumentSchema = z.object({
  userIds: z.array(mongoIdSchema).min(1),
});

const restoreVersionSchema = z.object({
  versionId: z.string().min(1),
});

const router = Router();

router.get("/:id/versions", verifyToken, requirePermission("documents.view"), getDocumentVersions);
router.post("/:id/versions", verifyToken, requirePermission("documents.edit"), validate(restoreVersionSchema), restoreDocumentVersion);

router.get("/", verifyToken, requirePermission("documents.view"), validateQuery(documentsQuerySchema), getDocuments);
router.get("/:id/public", getPublicDocument);
router.get("/:id", verifyToken, requirePermission("documents.view"), getDocumentById);
router.post("/", verifyToken, requirePermission("documents.create"), validate(createDocumentSchema), createDocument);
router.put("/:id", verifyToken, requirePermission("documents.edit"), updateDocument);
router.delete("/:id", verifyToken, requirePermission("documents.delete"), deleteDocument);
router.post("/:id/share", verifyToken, requirePermission("documents.edit"), validate(shareDocumentSchema), shareDocument);

export default router;
