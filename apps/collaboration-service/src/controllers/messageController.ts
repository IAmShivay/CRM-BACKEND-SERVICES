import { Request, Response } from "express";
import { Message } from "../models/Message";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { chatRoomId, page = "1", limit = "50" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      Message.find({ chatRoomId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Message.countDocuments({ chatRoomId }),
    ]);

    res.json({
      success: true,
      messages,
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
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const msg = await Message.create({
      ...req.body,
      senderId: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, message: msg });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to send message" });
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content, isEdited: true },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: "Message not found" });
    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ message: "Failed to update message" });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const { emoji } = req.body;
    const userId = (req as any).user?.userId;

    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { reactions: { userId, emoji } } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: "Message not found" });
    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ message: "Failed to add reaction" });
  }
};

export const removeReaction = async (req: Request, res: Response) => {
  try {
    const { emoji } = req.body;
    const userId = (req as any).user?.userId;

    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { $pull: { reactions: { userId, emoji } } },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: "Message not found" });
    res.json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove reaction" });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { chatRoomId, messageIds } = req.body;
    const userId = req.user!.userId;
    const filter: any = { chatRoomId, readBy: { $ne: userId } };
    if (Array.isArray(messageIds) && messageIds.length) filter._id = { $in: messageIds };
    const result = await Message.updateMany(filter, { $addToSet: { readBy: userId } });
    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};
