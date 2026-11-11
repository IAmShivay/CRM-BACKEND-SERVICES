import { Request, Response } from "express";
import { ChatRoom } from "../models/ChatRoom";

export const getChatRooms = async (req: Request, res: Response) => {
  try {
    const { workspaceId, type, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId, isArchived: false };
    if (type) filter.type = type;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [rooms, total] = await Promise.all([
      ChatRoom.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ChatRoom.countDocuments(filter),
    ]);

    res.json({
      success: true,
      chatRooms: rooms,
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
    res.status(500).json({ message: "Failed to fetch chat rooms" });
  }
};

export const getChatRoomById = async (req: Request, res: Response) => {
  try {
    const room = await ChatRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ message: "Chat room not found" });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chat room" });
  }
};

export const createChatRoom = async (req: Request, res: Response) => {
  try {
    const chatRoom = await ChatRoom.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, chatRoom });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create chat room" });
  }
};

export const updateChatRoom = async (req: Request, res: Response) => {
  try {
    const chatRoom = await ChatRoom.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!chatRoom) return res.status(404).json({ message: "Chat room not found" });
    res.json({ success: true, chatRoom });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update chat room" });
  }
};

export const deleteChatRoom = async (req: Request, res: Response) => {
  try {
    const room = await ChatRoom.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ message: "Chat room not found" });
    res.json({ success: true, message: "Chat room deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete chat room" });
  }
};

export const archiveChatRoom = async (req: Request, res: Response) => {
  try {
    const room = await ChatRoom.findByIdAndUpdate(req.params.id, { isArchived: true }, { new: true });
    if (!room) return res.status(404).json({ message: "Chat room not found" });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ message: "Failed to archive chat room" });
  }
};

export const addParticipant = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const room = await ChatRoom.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { participants: userId } },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: "Chat room not found" });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ message: "Failed to add participant" });
  }
};

export const removeParticipant = async (req: Request, res: Response) => {
  try {
    const room = await ChatRoom.findByIdAndUpdate(
      req.params.id,
      { $pull: { participants: req.params.userId } },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: "Chat room not found" });
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove participant" });
  }
};

const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024,
  maxFileSizeMB: 10,
  allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf", "text/plain", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  allowedExtensions: { images: [".jpg", ".jpeg", ".png", ".gif", ".webp"], documents: [".pdf", ".txt", ".csv", ".doc", ".docx", ".xls", ".xlsx"] },
};

export const getUploadConfig = async (_req: Request, res: Response) => {
  res.json({ success: true, config: UPLOAD_CONFIG });
};

export const initDefaultRooms = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    const userId = req.user!.userId;
    const existing = await ChatRoom.countDocuments({ workspaceId, isArchived: false });
    if (!existing) {
      await ChatRoom.create({ workspaceId, name: "general", type: "general", participants: [userId], createdBy: userId });
    }
    const rooms = await ChatRoom.find({ workspaceId, isArchived: false }).sort({ createdAt: 1 });
    res.json({ success: true, rooms, created: !existing });
  } catch (error) {
    res.status(500).json({ message: "Failed to initialise chat rooms" });
  }
};
