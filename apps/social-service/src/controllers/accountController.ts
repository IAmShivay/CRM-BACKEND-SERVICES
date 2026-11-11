import { Request, Response } from "express";
import { SocialAccount } from "../models/SocialAccount";

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const { workspaceId, platform } = req.query;

    const filter: any = { workspaceId };
    if (platform) filter.platform = platform;

    const accounts = await SocialAccount.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch accounts" });
  }
};

export const getAccountById = async (req: Request, res: Response) => {
  try {
    const account = await SocialAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch account" });
  }
};

export const createAccount = async (req: Request, res: Response) => {
  try {
    const account = await SocialAccount.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, account });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create account" });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const account = await SocialAccount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, account });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update account" });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const account = await SocialAccount.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, message: "Account deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete account" });
  }
};
