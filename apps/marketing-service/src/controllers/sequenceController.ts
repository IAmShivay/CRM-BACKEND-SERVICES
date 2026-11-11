import { Request, Response } from "express";
import { EmailSequence, SequenceEnrollment } from "../models/EmailSequence";

export const getSequences = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [sequences, total] = await Promise.all([
      EmailSequence.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      EmailSequence.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      sequences,
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
    res.status(500).json({ message: "Failed to fetch sequences" });
  }
};

export const getSequenceById = async (req: Request, res: Response) => {
  try {
    const sequence = await EmailSequence.findById(req.params.id);
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });

    const enrollments = await SequenceEnrollment.find({ sequenceId: req.params.id }).limit(100);
    res.json({ success: true, sequence, enrollments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch sequence" });
  }
};

export const createSequence = async (req: Request, res: Response) => {
  try {
    const sequence = await EmailSequence.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, sequence });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create sequence" });
  }
};

export const updateSequence = async (req: Request, res: Response) => {
  try {
    const sequence = await EmailSequence.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });
    res.json({ success: true, sequence });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update sequence" });
  }
};

export const deleteSequence = async (req: Request, res: Response) => {
  try {
    const sequence = await EmailSequence.findByIdAndDelete(req.params.id);
    if (!sequence) return res.status(404).json({ message: "Sequence not found" });
    await SequenceEnrollment.deleteMany({ sequenceId: req.params.id });
    res.json({ success: true, message: "Sequence deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete sequence" });
  }
};

export const enrollInSequence = async (req: Request, res: Response) => {
  try {
    const { sequenceId } = req.params;
    const enrollment = await SequenceEnrollment.create({ ...req.body, sequenceId });
    await EmailSequence.findByIdAndUpdate(sequenceId, { $inc: { enrolledCount: 1 } });
    res.status(201).json({ success: true, enrollment });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to enroll" });
  }
};
