import { Request, Response } from "express";
import { ComplianceTask } from "../models/ComplianceTask";
import { ComplianceDocument } from "../models/ComplianceDocument";

export const getComplianceTasks = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, category, financialYear, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (financialYear) filter.financialYear = financialYear;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      ComplianceTask.find(filter)
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limitNum),
      ComplianceTask.countDocuments(filter),
    ]);

    res.json({
      success: true,
      tasks,
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
    res.status(500).json({ message: "Failed to fetch compliance tasks" });
  }
};

export const createComplianceTask = async (req: Request, res: Response) => {
  try {
    const task = await ComplianceTask.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, message: "Task created successfully", task });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create compliance task" });
  }
};

export const getComplianceTaskById = async (req: Request, res: Response) => {
  try {
    const task = await ComplianceTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Compliance task not found" });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch compliance task" });
  }
};

export const updateComplianceTask = async (req: Request, res: Response) => {
  try {
    const task = await ComplianceTask.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) return res.status(404).json({ message: "Compliance task not found" });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ message: "Failed to update compliance task" });
  }
};

export const deleteComplianceTask = async (req: Request, res: Response) => {
  try {
    const task = await ComplianceTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: "Compliance task not found" });
    res.json({ success: true, message: "Compliance task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete compliance task" });
  }
};

export const getComplianceDocuments = async (req: Request, res: Response) => {
  try {
    const { workspaceId, category, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (category) filter.category = category;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await Promise.all([
      ComplianceDocument.find(filter)
        .sort({ expiryDate: 1 })
        .skip(skip)
        .limit(limitNum),
      ComplianceDocument.countDocuments(filter),
    ]);

    res.json({
      success: true,
      documents,
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
    res.status(500).json({ message: "Failed to fetch compliance documents" });
  }
};

export const createComplianceDocument = async (req: Request, res: Response) => {
  try {
    const document = await ComplianceDocument.create({
      ...req.body,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, message: "Document created successfully", document });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create compliance document" });
  }
};

export const getComplianceDocumentById = async (req: Request, res: Response) => {
  try {
    const document = await ComplianceDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Compliance document not found" });
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch compliance document" });
  }
};

export const updateComplianceDocument = async (req: Request, res: Response) => {
  try {
    const document = await ComplianceDocument.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!document) return res.status(404).json({ message: "Compliance document not found" });
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ message: "Failed to update compliance document" });
  }
};

export const deleteComplianceDocument = async (req: Request, res: Response) => {
  try {
    const document = await ComplianceDocument.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ message: "Compliance document not found" });
    res.json({ success: true, message: "Compliance document deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete compliance document" });
  }
};
