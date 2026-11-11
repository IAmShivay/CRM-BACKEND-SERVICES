import { Request, Response } from "express";
import { LeaveRequest } from "../models/Leave";

export const getLeaves = async (req: Request, res: Response) => {
  try {
    const { workspaceId, employeeId, status, page = "1", limit = "20" } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });

    const filter: any = { workspaceId };
    if (employeeId) filter.employeeId = employeeId;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter).sort({ appliedDate: -1 }).skip(skip).limit(limitNum),
      LeaveRequest.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      leaveRequests: leaves,
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
    res.status(500).json({ message: "Failed to fetch leaves" });
  }
};

export const createLeave = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const days = startDate && endDate ? Math.max(Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1, 1) : undefined;
    const leave = await LeaveRequest.create({
      ...req.body,
      employeeId: req.body.employeeId || req.user!.userId,
      totalDays: req.body.totalDays || days,
    });
    res.status(201).json({ success: true, leave });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create leave request" });
  }
};

export const approveLeave = async (req: Request, res: Response) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: "approved", approvedBy: req.body.approvedBy, approvedDate: new Date() },
      { new: true }
    );
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve leave" });
  }
};

export const rejectLeave = async (req: Request, res: Response) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", approvedBy: req.body.approvedBy, approvedDate: new Date(), rejectionReason: req.body.rejectionReason },
      { new: true }
    );
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject leave" });
  }
};

export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true });
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ message: "Failed to cancel leave" });
  }
};

export const getLeaveById = async (req: Request, res: Response) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ success: true, leave });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leave request" });
  }
};

export const updateLeave = async (req: Request, res: Response) => {
  try {
    const { workspaceId, ...updates } = req.body;
    const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ success: true, leave });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update leave request" });
  }
};

export const deleteLeave = async (req: Request, res: Response) => {
  try {
    const leave = await LeaveRequest.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ success: true, message: "Leave request deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete leave request" });
  }
};
