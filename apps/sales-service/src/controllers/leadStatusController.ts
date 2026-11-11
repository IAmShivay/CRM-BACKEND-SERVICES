import { Request, Response } from "express";
import { LeadStatus } from "../models/LeadStatus";

export const getLeadStatuses = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const statuses = await LeadStatus.find({ workspaceId, isActive: true }).sort({ order: 1 });
    res.json({ success: true, statuses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lead statuses" });
  }
};

export const createLeadStatus = async (req: Request, res: Response) => {
  try {
    const status = await LeadStatus.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, status });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create lead status" });
  }
};

export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const status = await LeadStatus.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!status) return res.status(404).json({ message: "Lead status not found" });
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update lead status" });
  }
};

export const deleteLeadStatus = async (req: Request, res: Response) => {
  try {
    const status = await LeadStatus.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!status) return res.status(404).json({ message: "Lead status not found" });
    res.json({ success: true, message: "Lead status deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete lead status" });
  }
};
