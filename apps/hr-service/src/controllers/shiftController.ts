import { Request, Response } from "express";
import { Shift } from "../models/Shift";

export const getShifts = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });
    const shifts = await Shift.find({ workspaceId, isActive: true }).sort({ name: 1 });
    res.json({ success: true, shifts });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shifts" });
  }
};

export const getShiftById = async (req: Request, res: Response) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    res.json({ success: true, shift });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shift" });
  }
};

export const createShift = async (req: Request, res: Response) => {
  try {
    const shift = await Shift.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, shift });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create shift" });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    res.json({ success: true, shift });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update shift" });
  }
};

export const deleteShift = async (req: Request, res: Response) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    res.json({ success: true, message: "Shift deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete shift" });
  }
};
