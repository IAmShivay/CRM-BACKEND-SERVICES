import { Request, Response } from "express";
import { Activity } from "../models/Activity";

export const getActivities = async (req: Request, res: Response) => {
  try {
    const { workspaceId, entityType, entityId, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Activity.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      activities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages,
        hasNext: pageNum < pages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
};

export const createActivity = async (req: Request, res: Response) => {
  try {
    const activity = await Activity.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, activity });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create activity" });
  }
};
