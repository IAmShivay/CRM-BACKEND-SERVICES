import { Request, Response } from "express";
import crypto from "crypto";
import { Meeting } from "../models/Meeting";

export const getMeetings = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [meetings, total] = await Promise.all([
      Meeting.find(filter)
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Meeting.countDocuments(filter),
    ]);

    res.json({
      success: true,
      meetings,
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
    res.status(500).json({ message: "Failed to fetch meetings" });
  }
};

export const getMeetingById = async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch meeting" });
  }
};

export const createMeeting = async (req: Request, res: Response) => {
  try {
    const jitsiRoomId = req.body.jitsiRoomId || `crm-${crypto.randomUUID().slice(0, 12)}`;

    const meeting = await Meeting.create({
      ...req.body,
      jitsiRoomId,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, meeting });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create meeting" });
  }
};

export const updateMeeting = async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ success: true, meeting });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update meeting" });
  }
};

export const deleteMeeting = async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ success: true, message: "Meeting deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete meeting" });
  }
};

export const joinMeeting = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { participantIds: userId },
        status: "in_progress",
      },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ message: "Failed to join meeting" });
  }
};

export const endMeeting = async (req: Request, res: Response) => {
  try {
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.id,
      { status: "completed" },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ message: "Failed to end meeting" });
  }
};

export const inviteToMeeting = async (req: Request, res: Response) => {
  try {
    const userIds: string[] = Array.isArray(req.body.userIds) ? req.body.userIds : [];
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, { $addToSet: { participantIds: { $each: userIds } } }, { new: true });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    res.json({ success: true, meeting, invited: userIds.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to invite participants" });
  }
};
