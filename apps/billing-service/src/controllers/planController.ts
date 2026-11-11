import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { DEFAULT_PLANS } from "@crm-platform/shared-types";
import { Plan } from "../models/Plan";

export const seedDefaultPlans = async () => {
  const count = await Plan.countDocuments();
  if (count > 0) return;
  for (const plan of DEFAULT_PLANS) {
    await Plan.findByIdAndUpdate(plan._id, plan, { upsert: true, new: true });
  }
  logger.info("Seeded default plans", { count: DEFAULT_PLANS.length });
};

export const getPlans = async (_req: Request, res: Response) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
};

export const getPlanById = async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch plan" });
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const plan = await Plan.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, plan });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create plan" });
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update plan" });
  }
};
