import { Request, Response } from "express";
import mongoose from "mongoose";
import { Attendance } from "../models/Attendance";
import { LeaveRequest as Leave } from "../models/Leave";

function workspaceMatch(workspaceId: string) {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(workspaceId)
    ? { $or: [{ workspaceId }, { workspaceId: new ObjectId(workspaceId) }] }
    : { workspaceId };
}

export const getHrStats = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [totalEmployees, todays] = await Promise.all([
      mongoose.connection.db!.collection("workspacemembers").countDocuments({ ...workspaceMatch(workspaceId), status: "active" }),
      Attendance.find({ workspaceId, date: { $gte: start, $lt: end } }).lean(),
    ]);

    const presentToday = new Set(todays.map((r: any) => String(r.userId))).size;
    const lateToday = todays.filter((r: any) => r.status === "late").length;
    const totalMinutes = todays.reduce((sum: number, r: any) => sum + (r.totalWorkTime || 0), 0);

    res.json({
      success: true,
      totalEmployees,
      presentToday,
      absentToday: Math.max(totalEmployees - presentToday, 0),
      lateToday,
      attendanceRate: totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0,
      totalWorkHours: Number((totalMinutes / 60).toFixed(1)),
      avgWorkHours: presentToday ? Number((totalMinutes / 60 / presentToday).toFixed(1)) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch HR stats" });
  }
};

export const getLeaveStats = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const wsId = new mongoose.Types.ObjectId(workspaceId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [pendingCount, approvedThisMonth, yearAgg, upcomingLeaves, breakdown] = await Promise.all([
      Leave.countDocuments({ workspaceId, status: "pending" }),
      Leave.countDocuments({ workspaceId, status: "approved", startDate: { $gte: monthStart } }),
      Leave.aggregate([
        { $match: { workspaceId: wsId, status: "approved", startDate: { $gte: yearStart } } },
        { $group: { _id: null, days: { $sum: "$totalDays" } } },
      ]),
      Leave.countDocuments({ workspaceId, status: "approved", startDate: { $gt: now } }),
      Leave.aggregate([
        { $match: { workspaceId: wsId } },
        { $group: { _id: "$leaveType", count: { $sum: 1 }, totalDays: { $sum: "$totalDays" } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      pendingCount,
      approvedThisMonth,
      totalDaysUsedThisYear: yearAgg[0]?.days || 0,
      upcomingLeaves,
      leaveTypeBreakdown: breakdown.map((b: any) => ({ id: b._id, count: b.count, totalDays: b.totalDays })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leave stats" });
  }
};
