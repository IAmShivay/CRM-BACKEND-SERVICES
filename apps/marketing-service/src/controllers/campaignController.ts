import { Request, Response } from "express";
import { Campaign, CampaignEnrollment } from "../models/Campaign";

export const getCampaigns = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Campaign.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      campaigns,
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
    res.status(500).json({ message: "Failed to fetch campaigns" });
  }
};

export const getCampaignById = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const enrollments = await CampaignEnrollment.find({ campaignId: req.params.id }).limit(100);
    res.json({ success: true, campaign, enrollments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch campaign" });
  }
};

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, campaign });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create campaign" });
  }
};

export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    res.json({ success: true, campaign });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update campaign" });
  }
};

export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });
    await CampaignEnrollment.deleteMany({ campaignId: req.params.id });
    res.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete campaign" });
  }
};

export const enrollInCampaign = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const enrollment = await CampaignEnrollment.create({ ...req.body, campaignId });
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { enrolledCount: 1 } });
    res.status(201).json({ success: true, enrollment });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to enroll" });
  }
};

export const bulkEnroll = async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { enrollments } = req.body;

    const docs = enrollments.map((e: any) => ({ ...e, campaignId }));
    const created = await CampaignEnrollment.insertMany(docs, { ordered: false });
    await Campaign.findByIdAndUpdate(campaignId, { $inc: { enrolledCount: created.length } });
    res.status(201).json({ success: true, count: created.length });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to bulk enroll" });
  }
};
