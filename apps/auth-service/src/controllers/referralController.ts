import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { REFERRAL_STEP_STATUSES } from "@crm-platform/shared-types";

const Referral = mongoose.models?.Referral || mongoose.model("Referral", new mongoose.Schema(
  {
    referrerId: { type: String, ref: "User", required: true },
    referrerWorkspaceId: { type: String, ref: "Workspace", required: true },
    referralCode: { type: String, required: true, unique: true },
    referredEmail: { type: String },
    referredUserId: { type: String, ref: "User" },
    status: { type: String, enum: [...REFERRAL_STEP_STATUSES], default: REFERRAL_STEP_STATUSES[0] },
    reward: {
      type: { type: String },
      value: { type: Number },
      appliedAt: { type: Date },
    },
    signedUpAt: { type: Date },
    convertedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } },
  }
));

export const getReferralCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { workspaceId } = req.query;

    let referral = await Referral.findOne({ referrerId: userId, referrerWorkspaceId: workspaceId, referredEmail: null });

    if (!referral) {
      const code = `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      referral = await Referral.create({
        referrerId: userId,
        referrerWorkspaceId: workspaceId,
        referralCode: code,
      });
    }

    res.json({ success: true, referralCode: (referral as any).referralCode });
  } catch (error) {
    res.status(500).json({ message: "Failed to get referral code" });
  }
};

export const createReferral = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { workspaceId, email } = req.body;

    const code = `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const referral = await Referral.create({
      referrerId: userId,
      referrerWorkspaceId: workspaceId,
      referralCode: code,
      referredEmail: email,
      status: "pending",
    });

    res.status(201).json({ success: true, referral });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create referral" });
  }
};

export const getReferrals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { workspaceId, page = "1", limit = "20" } = req.query;

    const filter: any = { referrerId: userId, referrerWorkspaceId: workspaceId };

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [referrals, total] = await Promise.all([
      Referral.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Referral.countDocuments(filter),
    ]);

    res.json({
      success: true,
      referrals,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: pageNum * limitNum < total,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
};

export const getReferralStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { workspaceId } = req.query;

    const filter = { referrerId: userId, referrerWorkspaceId: workspaceId };

    const [total, signedUp, converted, rewarded] = await Promise.all([
      Referral.countDocuments(filter),
      Referral.countDocuments({ ...filter, status: { $in: ["signed_up", "converted", "rewarded"] } }),
      Referral.countDocuments({ ...filter, status: { $in: ["converted", "rewarded"] } }),
      Referral.countDocuments({ ...filter, status: "rewarded" }),
    ]);

    res.json({
      success: true,
      stats: { totalReferrals: total, signedUp, converted, rewarded },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch referral stats" });
  }
};

export const validateReferralCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const referral = await Referral.findOne({ referralCode: code });

    if (!referral) {
      return res.status(404).json({ success: false, message: "Invalid referral code" });
    }

    res.json({ success: true, valid: true, referralCode: code });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate referral code" });
  }
};
