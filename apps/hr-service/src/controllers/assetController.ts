import { Request, Response } from "express";
import mongoose from "mongoose";
import { Asset } from "../models/Asset";

export const getAssets = async (req: Request, res: Response) => {
  try {
    const { workspaceId, category, status, search, page = "1", limit = "20" } = req.query;
    if (!workspaceId) return res.status(400).json({ message: "workspaceId required" });

    const filter: any = { workspaceId };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.$text = { $search: search as string };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [assets, total] = await Promise.all([
      Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Asset.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      assets,
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
    res.status(500).json({ message: "Failed to fetch assets" });
  }
};

export const getAssetById = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json({ success: true, asset });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch asset" });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, asset });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create asset" });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json({ success: true, asset });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update asset" });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json({ success: true, message: "Asset deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete asset" });
  }
};

export const getAssetStats = async (req: Request, res: Response) => {
  try {
    const workspaceId = new mongoose.Types.ObjectId(String(req.query.workspaceId));
    const [byStatus, byCategory, totals] = await Promise.all([
      Asset.aggregate([{ $match: { workspaceId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Asset.aggregate([{ $match: { workspaceId } }, { $group: { _id: "$category", count: { $sum: 1 }, totalValue: { $sum: "$purchasePrice" } } }]),
      Asset.aggregate([{ $match: { workspaceId } }, { $group: { _id: null, total: { $sum: 1 }, value: { $sum: "$purchasePrice" } } }]),
    ]);
    const status: Record<string, number> = { available: 0, allocated: 0, maintenance: 0, retired: 0, lost: 0, damaged: 0 };
    for (const s of byStatus) status[s._id] = s.count;
    res.json({
      success: true,
      totalAssets: totals[0]?.total || 0,
      byStatus: status,
      totalPortfolioValue: totals[0]?.value || 0,
      categoryBreakdown: byCategory.map((c: any) => ({ id: c._id, count: c.count, totalValue: c.totalValue })),
      upcomingMaintenance: status.maintenance,
      overdueReturns: 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch asset stats" });
  }
};
