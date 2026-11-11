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
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notificationController";

const notificationsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  isRead: z.string().optional(),
});

const createNotificationSchema = z.object({
  workspaceId: workspaceIdSchema,
  userId: mongoIdSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  notificationLevel: z.enum(["low", "medium", "high", "urgent"]).default("low"),
});

const markAllReadSchema = z.object({
  workspaceId: workspaceIdSchema,
});

const unreadCountQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const router = Router();

router.get("/", verifyToken, requirePermission("notifications.view"), validateQuery(notificationsQuerySchema), getNotifications);
router.get("/unread-count", verifyToken, requirePermission("notifications.view"), validateQuery(unreadCountQuerySchema), getUnreadCount);
router.post("/", verifyToken, requirePermission("notifications.create"), validate(createNotificationSchema), createNotification);
router.put("/:id/read", verifyToken, requirePermission("notifications.view"), markAsRead);
router.post("/mark-all-read", verifyToken, requirePermission("notifications.view"), validate(markAllReadSchema), markAllAsRead);
router.delete("/:id", verifyToken, requirePermission("notifications.delete"), deleteNotification);

export default router;
