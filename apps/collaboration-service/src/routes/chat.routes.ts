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
  getChatRooms,
  getChatRoomById,
  createChatRoom,
  updateChatRoom,
  deleteChatRoom,
  archiveChatRoom,
  addParticipant,
  removeParticipant,
  initDefaultRooms,
  getUploadConfig,
} from "../controllers/chatController";

const chatRoomsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  type: z.enum(["general", "private", "direct"]).optional(),
});

const createChatRoomSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(100),
  type: z.enum(["general", "private", "direct"]).default("general"),
  participants: z.array(mongoIdSchema).optional(),
  settings: z.record(z.any()).optional(),
});

const addParticipantSchema = z.object({
  userId: mongoIdSchema,
});

const router = Router();

router.post("/init-defaults", verifyToken, initDefaultRooms);
router.get("/upload/config", verifyToken, getUploadConfig);
router.get("/rooms", verifyToken, requirePermission("chat.view"), validateQuery(chatRoomsQuerySchema), getChatRooms);
router.get("/rooms/:id", verifyToken, requirePermission("chat.view"), getChatRoomById);
router.post("/rooms", verifyToken, requirePermission("chat.create"), validate(createChatRoomSchema), createChatRoom);
router.put("/rooms/:id", verifyToken, requirePermission("chat.edit"), updateChatRoom);
router.delete("/rooms/:id", verifyToken, requirePermission("chat.delete"), deleteChatRoom);
router.post("/rooms/:id/archive", verifyToken, requirePermission("chat.edit"), archiveChatRoom);
router.post("/rooms/:id/participants", verifyToken, requirePermission("chat.edit"), validate(addParticipantSchema), addParticipant);
router.delete("/rooms/:id/participants/:userId", verifyToken, requirePermission("chat.edit"), removeParticipant);

router.post("/upload", verifyToken, requirePermission("chat.create"), (req, res) => {
  res.json({
    success: true,
    file: {
      url: "",
      name: "upload",
      size: 0,
      type: "application/octet-stream",
      path: "",
    },
    message: "File upload requires storage configuration",
  });
});

export default router;
