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
  getMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessagesAsRead,
} from "../controllers/messageController";

const messagesQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  chatRoomId: mongoIdSchema,
});

const sendMessageSchema = z.object({
  workspaceId: workspaceIdSchema,
  chatRoomId: mongoIdSchema,
  senderName: z.string().min(1).max(100),
  content: z.string().min(1),
  type: z.enum(["text", "file", "image"]).default("text"),
  replyTo: mongoIdSchema.optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    mimeType: z.string(),
  })).optional(),
});

const updateMessageSchema = z.object({
  content: z.string().min(1),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

const router = Router();

router.post("/read", verifyToken, markMessagesAsRead);
router.get("/", verifyToken, requirePermission("chat.view"), validateQuery(messagesQuerySchema), getMessages);
router.post("/", verifyToken, requirePermission("chat.create"), validate(sendMessageSchema), sendMessage);
router.put("/:id", verifyToken, requirePermission("chat.edit"), validate(updateMessageSchema), updateMessage);
router.delete("/:id", verifyToken, requirePermission("chat.delete"), deleteMessage);
router.post("/:id/reactions", verifyToken, requirePermission("chat.edit"), validate(reactionSchema), addReaction);
router.delete("/:id/reactions", verifyToken, requirePermission("chat.edit"), validate(reactionSchema), removeReaction);

export default router;
