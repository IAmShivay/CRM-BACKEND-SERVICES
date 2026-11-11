import { Request, Response } from "express";
import { Activity } from "../models/Activity";
import { Lead } from "../models/Lead";
import { createDealForLead } from "../services/dealAutomation";
import { Deal } from "../models/Deal";

export const getDeals = async (req: Request, res: Response) => {
  try {
    const { workspaceId, pipelineId, stageId, status, assignedTo, leadId, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (pipelineId) filter.pipelineId = pipelineId;
    if (leadId) filter.leadId = leadId;
    if (stageId) filter.stageId = stageId;
    if (status) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [deals, total] = await Promise.all([
      Deal.find(filter).populate('pipelineId stageId contactId leadId assignedTo').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Deal.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      deals,
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
    res.status(500).json({ message: "Failed to fetch deals" });
  }
};

export const getDealById = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findById(req.params.id).populate('pipelineId stageId contactId leadId assignedTo');
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deal" });
  }
};

export const createDeal = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, deal });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create deal" });
  }
};

export const createDealFromLead = async (req: Request, res: Response) => {
  try {
    const lead = await Lead.findById(req.body.leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const deal = await createDealForLead(lead);
    res.json({ success: true, deal });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to create deal from lead" });
  }
};

export const updateDeal = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ success: true, deal });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update deal" });
  }
};

export const deleteDeal = async (req: Request, res: Response) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ success: true, message: "Deal deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete deal" });
  }
};

export const wonDeal = async (req: Request, res: Response) => {
  try {
    const { wonNote } = req.body;
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { status: "won", wonNote, actualCloseDate: new Date(), probability: 100 },
      { new: true }
    );
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark deal as won" });
  }
};

export const lostDeal = async (req: Request, res: Response) => {
  try {
    const { lostReason } = req.body;
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { status: "lost", lostReason, actualCloseDate: new Date(), probability: 0 },
      { new: true }
    );
    if (!deal) return res.status(404).json({ message: "Deal not found" });
    res.json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark deal as lost" });
  }
};

export const getDealAnalytics = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;

    const [byStatus, byStage, totalValue] = await Promise.all([
      Deal.aggregate([
        { $match: { workspaceId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalValue: { $sum: "$value" },
          },
        },
      ]),
      Deal.aggregate([
        { $match: { workspaceId, status: "open" } },
        {
          $group: {
            _id: "$stageId",
            count: { $sum: 1 },
            totalValue: { $sum: "$value" },
          },
        },
      ]),
      Deal.aggregate([
        { $match: { workspaceId } },
        {
          $group: {
            _id: null,
            total: { $sum: "$value" },
            count: { $sum: 1 },
            avgValue: { $avg: "$value" },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      analytics: {
        byStatus,
        byStage,
        summary: totalValue[0] || { total: 0, count: 0, avgValue: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deal analytics" });
  }
};

export const moveDealStage = async (req: Request, res: Response) => {
  try {
    const { stageId, stageName } = req.body;

    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: "Deal not found" });

    const now = new Date();
    if (deal.stageHistory && deal.stageHistory.length > 0) {
      const lastEntry = deal.stageHistory[deal.stageHistory.length - 1];
      lastEntry.exitedAt = now;
      lastEntry.duration = now.getTime() - new Date(lastEntry.enteredAt).getTime();
    }

    deal.stageHistory.push({
      stageId,
      stageName: stageName || stageId,
      enteredAt: now,
    });

    deal.stageId = stageId;
    deal.stageEnteredAt = now;
    await deal.save();

    res.json({ success: true, deal });
  } catch (error) {
    res.status(500).json({ message: "Failed to move deal stage" });
  }
};

export const getDealActivities = async (req: Request, res: Response) => {
  try {
    const { workspaceId, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const filter = { workspaceId, entityType: "deal", entityId: req.params.id };
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Activity.countDocuments(filter),
    ]);
    res.json({ success: true, activities, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deal activities" });
  }
};
