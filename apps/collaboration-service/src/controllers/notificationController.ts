import { Request, Response } from "express";
import { sendPushToUser } from "../services/push";
import { Notification } from "../models/Notification";

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { workspaceId, isRead, page = "1", limit = "20" } = req.query;
    const userId = (req as any).user?.userId;

    const filter: any = { workspaceId, userId };
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
      Notification.countDocuments({ workspaceId, userId, isRead: false }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    sendPushToUser(notification.userId, { title: notification.title, body: notification.message, tag: notification._id.toString() }).catch(() => undefined);
    res.status(201).json({ success: true, notification });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create notification" });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    const userId = (req as any).user?.userId;

    await Notification.updateMany(
      { workspaceId, userId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark all as read" });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    res.json({ success: true, message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete notification" });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const userId = (req as any).user?.userId;

    const count = await Notification.countDocuments({ workspaceId, userId, isRead: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: "Failed to get unread count" });
  }
};
