import { Request, Response } from "express";
import { WhatsAppBotFlow } from "../models/WhatsAppBotFlow";

export const getBotFlows = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId } = req.query;

    const filter: any = { workspaceId };
    if (accountId) filter.accountId = accountId;

    const flows = await WhatsAppBotFlow.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, botFlows: flows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bot flows" });
  }
};

export const getBotFlowById = async (req: Request, res: Response) => {
  try {
    const flow = await WhatsAppBotFlow.findById(req.params.id);
    if (!flow) return res.status(404).json({ message: "Bot flow not found" });
    res.json({ success: true, botFlow: flow });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch bot flow" });
  }
};

export const createBotFlow = async (req: Request, res: Response) => {
  try {
    const flow = await WhatsAppBotFlow.create({ ...req.body, createdBy: req.user!.userId });
    res.status(201).json({ success: true, botFlow: flow });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create bot flow" });
  }
};

export const updateBotFlow = async (req: Request, res: Response) => {
  try {
    const flow = await WhatsAppBotFlow.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!flow) return res.status(404).json({ message: "Bot flow not found" });
    res.json({ success: true, botFlow: flow });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update bot flow" });
  }
};

export const deleteBotFlow = async (req: Request, res: Response) => {
  try {
    const flow = await WhatsAppBotFlow.findByIdAndDelete(req.params.id);
    if (!flow) return res.status(404).json({ message: "Bot flow not found" });
    res.json({ success: true, message: "Bot flow deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete bot flow" });
  }
};
