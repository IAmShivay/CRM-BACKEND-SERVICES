import { Request, Response } from "express";
import { Pipeline } from "../models/Pipeline";
import { PipelineStage } from "../models/PipelineStage";
import { ensureDefaultPipeline } from "../services/dealAutomation";

export const getPipelines = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    let pipelines = await Pipeline.find({ workspaceId, isActive: true }).sort({ createdAt: -1 });
    if (!pipelines.length) {
      await ensureDefaultPipeline(String(workspaceId), req.user!.userId);
      pipelines = await Pipeline.find({ workspaceId, isActive: true }).sort({ createdAt: -1 });
    }
    res.json({ success: true, pipelines });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pipelines" });
  }
};

export const getPipelineById = async (req: Request, res: Response) => {
  try {
    const pipeline = await Pipeline.findById(req.params.id);
    if (!pipeline) return res.status(404).json({ message: "Pipeline not found" });
    const stages = await PipelineStage.find({ pipelineId: req.params.id, isActive: true }).sort({ order: 1 });
    res.json({ success: true, pipeline: { ...pipeline.toJSON(), stages }, stages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pipeline" });
  }
};

export const createPipeline = async (req: Request, res: Response) => {
  try {
    const pipeline = await Pipeline.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, pipeline });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create pipeline" });
  }
};

export const updatePipeline = async (req: Request, res: Response) => {
  try {
    const pipeline = await Pipeline.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pipeline) return res.status(404).json({ message: "Pipeline not found" });
    res.json({ success: true, pipeline });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update pipeline" });
  }
};

export const deletePipeline = async (req: Request, res: Response) => {
  try {
    const pipeline = await Pipeline.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!pipeline) return res.status(404).json({ message: "Pipeline not found" });
    res.json({ success: true, message: "Pipeline deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete pipeline" });
  }
};

export const getStages = async (req: Request, res: Response) => {
  try {
    const stages = await PipelineStage.find({ pipelineId: req.params.id, isActive: true }).sort({ order: 1 });
    res.json({ success: true, stages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stages" });
  }
};

export const createStage = async (req: Request, res: Response) => {
  try {
    const stage = await PipelineStage.create({ ...req.body, pipelineId: req.params.id, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, stage });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create stage" });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const stage = await PipelineStage.findByIdAndUpdate(req.params.stageId, req.body, { new: true, runValidators: true });
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    res.json({ success: true, stage });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update stage" });
  }
};

export const deleteStage = async (req: Request, res: Response) => {
  try {
    const stage = await PipelineStage.findByIdAndUpdate(req.params.stageId, { isActive: false }, { new: true });
    if (!stage) return res.status(404).json({ message: "Stage not found" });
    res.json({ success: true, message: "Stage deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete stage" });
  }
};
