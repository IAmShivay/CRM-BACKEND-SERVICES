import { Request, Response } from "express";
import { Column } from "../models/Column";

export const getColumns = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const columns = await Column.find({ projectId }).sort({ order: 1 });
    res.json({ success: true, columns });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch columns" });
  }
};

export const createColumn = async (req: Request, res: Response) => {
  try {
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const maxOrder = await Column.findOne({ projectId: req.body.projectId })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const column = await Column.create({
      ...req.body,
      slug,
      order: maxOrder ? (maxOrder as any).order + 1 : 0,
    });
    res.status(201).json({ success: true, column });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create column" });
  }
};

export const updateColumn = async (req: Request, res: Response) => {
  try {
    const column = await Column.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!column) return res.status(404).json({ message: "Column not found" });
    res.json({ success: true, column });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update column" });
  }
};

export const deleteColumn = async (req: Request, res: Response) => {
  try {
    const column = await Column.findByIdAndDelete(req.params.id);
    if (!column) return res.status(404).json({ message: "Column not found" });
    res.json({ success: true, message: "Column deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete column" });
  }
};

export const reorderColumns = async (req: Request, res: Response) => {
  try {
    const { columns } = req.body;
    const ops = columns.map((c: { id: string; order: number }) => ({
      updateOne: {
        filter: { _id: c.id },
        update: { $set: { order: c.order } },
      },
    }));
    await Column.bulkWrite(ops);
    res.json({ success: true, message: "Columns reordered" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reorder columns" });
  }
};
