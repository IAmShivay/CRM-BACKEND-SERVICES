import { Request, Response } from "express";
import { Project } from "../models/Project";

export const getProjects = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, search, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search as string };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      projects,
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
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project" });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const project = await Project.create({
      ...req.body,
      slug,
      createdBy: (req as any).user?.userId,
    });
    res.status(201).json({ success: true, project });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create project" });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ success: true, project });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update project" });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ success: true, message: "Project deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete project" });
  }
};
