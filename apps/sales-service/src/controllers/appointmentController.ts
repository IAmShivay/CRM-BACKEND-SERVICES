import { Request, Response } from "express";
import { Appointment } from "../models/Appointment";

const DEFAULT_DURATION_MINUTES = 60;

const computeEndTime = (startTime: Date, duration: number) => new Date(startTime.getTime() + duration * 60000);

export const getAppointments = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, assignedTo, startDate, endDate, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate as string);
      if (endDate) filter.startTime.$lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [appointments, total] = await Promise.all([
      Appointment.find(filter).sort({ startTime: 1 }).skip(skip).limit(limitNum),
      Appointment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      appointments,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

export const getAppointmentById = async (req: Request, res: Response) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appointment" });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  try {
    const startTime = new Date(req.body.startTime);
    const duration = Number(req.body.duration) || DEFAULT_DURATION_MINUTES;
    const appointment = await Appointment.create({
      ...req.body,
      startTime,
      duration,
      endTime: computeEndTime(startTime, duration),
      createdBy: req.body.createdBy || req.user?.userId,
    });
    res.status(201).json({ success: true, appointment });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create appointment" });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  try {
    const existing = await Appointment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Appointment not found" });
    const { workspaceId: _workspaceId, ...changes } = req.body;
    const startTime = changes.startTime ? new Date(changes.startTime) : existing.startTime;
    const duration = changes.duration !== undefined ? Number(changes.duration) : existing.duration;
    existing.set({ ...changes, startTime, duration, endTime: computeEndTime(startTime, duration) });
    await existing.save();
    res.json({ success: true, appointment: existing });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update appointment" });
  }
};

export const getAppointmentAnalytics = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    const [byStatus, upcoming] = await Promise.all([
      Appointment.aggregate([
        { $match: { workspaceId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Appointment.countDocuments({
        workspaceId,
        startTime: { $gte: new Date() },
        status: { $nin: ["cancelled", "completed"] },
      }),
    ]);

    res.json({
      success: true,
      analytics: { byStatus, upcomingCount: upcoming },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch appointment analytics" });
  }
};

export const deleteAppointment = async (req: Request, res: Response) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    res.json({ success: true, message: "Appointment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete appointment" });
  }
};
