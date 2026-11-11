import { Request, Response } from "express";
import { CalendarEvent } from "../models/CalendarEvent";

export const getCalendarEvents = async (req: Request, res: Response) => {
  try {
    const { workspaceId, startDate, endDate, page = "1", limit = "100" } = req.query;

    const filter: any = { workspaceId };
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate as string);
      if (endDate) filter.startDate.$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      CalendarEvent.find(filter)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limitNum),
      CalendarEvent.countDocuments(filter),
    ]);

    res.json({
      success: true,
      events,
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
    res.status(500).json({ message: "Failed to fetch calendar events" });
  }
};

export const getCalendarEventById = async (req: Request, res: Response) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch calendar event" });
  }
};

export const createCalendarEvent = async (req: Request, res: Response) => {
  try {
    const event = await CalendarEvent.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, event });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create calendar event" });
  }
};

export const updateCalendarEvent = async (req: Request, res: Response) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    res.json({ success: true, event });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update calendar event" });
  }
};

export const deleteCalendarEvent = async (req: Request, res: Response) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    res.json({ success: true, message: "Calendar event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete calendar event" });
  }
};

export const respondToEvent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { status } = req.body;

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: req.params.id, "attendees.userId": userId },
      { $set: { "attendees.$.status": status } },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Calendar event not found" });
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ message: "Failed to respond to event" });
  }
};
