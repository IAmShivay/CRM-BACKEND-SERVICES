import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { processDueCampaigns, processDueSequences } from "../services/campaignProcessor";

export const processCampaigns = async (_req: Request, res: Response) => {
  try {
    const result = await processDueCampaigns(100);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error("Failed to process campaigns", { error });
    res.status(500).json({ message: "Failed to process campaigns" });
  }
};

export const processSequences = async (_req: Request, res: Response) => {
  try {
    const result = await processDueSequences(100);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error("Failed to process sequences", { error });
    res.status(500).json({ message: "Failed to process sequences" });
  }
};
