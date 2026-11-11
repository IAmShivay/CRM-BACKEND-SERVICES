import { Request, Response } from "express";
import { Tag } from "../models/Tag";

export const getTags = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const tags = await Tag.find({ workspaceId }).sort({ name: 1 });
    res.json({ success: true, tags });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tags" });
  }
};

export const createTag = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, tag });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create tag" });
  }
};

export const updateTag = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!tag) return res.status(404).json({ message: "Tag not found" });
    res.json({ success: true, tag });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update tag" });
  }
};

export const deleteTag = async (req: Request, res: Response) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });
    res.json({ success: true, message: "Tag deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete tag" });
  }
};
