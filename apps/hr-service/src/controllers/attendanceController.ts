import { Request, Response } from "express";
import { Attendance } from "../models/Attendance";
import { Shift } from "../models/Shift";

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const { workspaceId, userId, date, startDate, endDate, page = "1", limit = "20" } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });

    const filter: any = { workspaceId };
    if (userId) filter.userId = userId;
    if (date) {
      const d = new Date(date as string);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum),
      Attendance.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      attendance: records,
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
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
};

const ACTIVE_STATUSES = ["clocked_in", "late"];

const minutesBetween = (a: Date, b: Date) => Math.max(Math.round((b.getTime() - a.getTime()) / 60000), 0);

const liveWorkTime = (record: any, now: Date) => {
  if (!record?.clockIn) return 0;
  const end = record.clockOut ? new Date(record.clockOut) : now;
  let breakMinutes = record.totalBreakTime || 0;
  if (record.status === "on_break" && record.breakStart) breakMinutes += minutesBetween(new Date(record.breakStart), now);
  return Math.max(minutesBetween(new Date(record.clockIn), end) - breakMinutes, 0);
};

const displayStatus = (status: string) =>
  status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export const getAttendanceToday = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });

    const userId = req.user!.userId;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      workspaceId,
      userId,
      date: { $gte: today, $lt: tomorrow },
    }).populate("shiftId", "name startTime endTime totalHours breakDuration gracePeriod");

    const actions = { canClockIn: true, canClockOut: false, canStartBreak: false, canEndBreak: false };
    let shift: any = attendance?.shiftId || null;
    if (attendance) {
      const status = attendance.status;
      if (ACTIVE_STATUSES.includes(status)) {
        actions.canClockIn = false;
        actions.canClockOut = true;
        actions.canStartBreak = true;
      } else if (status === "on_break") {
        actions.canClockIn = false;
        actions.canEndBreak = true;
      } else if (status === "clocked_out") {
        actions.canClockIn = false;
      }
    } else {
      shift = await Shift.findOne({ workspaceId, isDefault: true, isActive: true });
    }

    const currentWorkTime = attendance ? liveWorkTime(attendance, now) : 0;
    const expectedClockOut =
      attendance && attendance.status !== "clocked_out" && shift?.totalHours
        ? new Date(new Date(attendance.clockIn).getTime() + shift.totalHours * 3600000)
        : null;

    const workspaceSummary = await Attendance.aggregate([
      { $match: { workspaceId: String(workspaceId), date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const attendanceJson = attendance
      ? { ...attendance.toJSON(), totalWorkTime: currentWorkTime, displayStatus: displayStatus(attendance.status) }
      : null;

    res.json({
      success: true,
      attendance: attendanceJson,
      shift,
      actions,
      currentWorkTime,
      expectedClockOut,
      workspaceSummary,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch today's attendance" });
  }
};

export const clockIn = async (req: Request, res: Response) => {
  try {
    const record = await Attendance.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to clock in" });
  }
};

export const clockOut = async (req: Request, res: Response) => {
  try {
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { clockOut: new Date(), status: "clocked_out", ...req.body },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ message: "Attendance record not found" });
    res.json({ success: true, attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to clock out" });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ message: "Attendance record not found" });
    res.json({ success: true, attendance: record });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update attendance" });
  }
};

export const attendanceAction = async (req: Request, res: Response) => {
  try {
    const { action, workspaceId, workType, location, notes } = req.body;
    const userId = req.user!.userId;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let record = await Attendance.findOne({ userId, workspaceId, date: { $gte: dayStart, $lt: dayEnd } }).sort({ createdAt: -1 });

    if (action === "clock_in") {
      if (record && record.status !== "clocked_out") {
        return res.status(400).json({ message: "Already clocked in" });
      }
      const shift = await Shift.findOne({ workspaceId, isDefault: true, isActive: true });
      record = await Attendance.create({
        userId,
        workspaceId,
        date: dayStart,
        clockIn: now,
        status: "clocked_in",
        shiftId: shift?._id,
        regularHours: shift?.totalHours || 8,
        workType: workType || "office",
        location: location ? { clockInLocation: location } : undefined,
        notes,
      });
      return res.status(201).json({ success: true, attendance: record, message: "Clocked in" });
    }

    if (!record || record.status === "clocked_out") {
      return res.status(400).json({ message: "No active attendance session" });
    }

    if (action === "break_start") {
      if (record.status !== "clocked_in") return res.status(400).json({ message: "Cannot start a break now" });
      record.breakStart = now;
      record.status = "on_break";
    } else if (action === "break_end") {
      if (record.status !== "on_break" || !record.breakStart) return res.status(400).json({ message: "Not on a break" });
      record.totalBreakTime = (record.totalBreakTime || 0) + minutesBetween(record.breakStart, now);
      record.breakEnd = now;
      record.status = "clocked_in";
    } else if (action === "clock_out") {
      if (record.status === "on_break" && record.breakStart) {
        record.totalBreakTime = (record.totalBreakTime || 0) + minutesBetween(record.breakStart, now);
        record.breakEnd = now;
      }
      record.clockOut = now;
      record.totalWorkTime = Math.max(minutesBetween(record.clockIn, now) - (record.totalBreakTime || 0), 0);
      record.status = "clocked_out";
      if (location) record.location = { ...(record.location || {}), clockOutLocation: location };
    } else {
      return res.status(400).json({ message: "Unknown action" });
    }

    if (notes) record.notes = notes;
    await record.save();
    res.json({ success: true, attendance: record, message: action.replace("_", " ") });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Attendance action failed" });
  }
};
