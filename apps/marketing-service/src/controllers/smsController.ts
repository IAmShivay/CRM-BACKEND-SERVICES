import { Request, Response } from "express";
import { SmsLog } from "../models/SmsLog";
import { SmsTemplate } from "../models/SmsTemplate";

export const getSmsLogs = async (req: Request, res: Response) => {
  try {
    const { workspaceId, status, to, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (status) filter.status = status;
    if (to) filter.to = to;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      SmsLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      SmsLog.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      logs,
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
    res.status(500).json({ message: "Failed to fetch SMS logs" });
  }
};

export const sendSms = async (req: Request, res: Response) => {
  try {
    const log = await SmsLog.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, smsLog: log });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to send SMS" });
  }
};

export const getSmsTemplates = async (req: Request, res: Response) => {
  try {
    const { workspaceId, type } = req.query;

    const filter: any = { workspaceId, isActive: true };
    if (type) filter.type = type;

    const templates = await SmsTemplate.find(filter).sort({ name: 1 });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch SMS templates" });
  }
};

export const createSmsTemplate = async (req: Request, res: Response) => {
  try {
    const template = await SmsTemplate.create({ ...req.body, createdBy: req.body.createdBy || req.user?.userId });
    res.status(201).json({ success: true, template });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create SMS template" });
  }
};

export const updateSmsTemplate = async (req: Request, res: Response) => {
  try {
    const template = await SmsTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ message: "SMS template not found" });
    res.json({ success: true, template });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update SMS template" });
  }
};

export const deleteSmsTemplate = async (req: Request, res: Response) => {
  try {
    const template = await SmsTemplate.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!template) return res.status(404).json({ message: "SMS template not found" });
    res.json({ success: true, message: "SMS template deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete SMS template" });
  }
};

export const sendBulkSms = async (req: Request, res: Response) => {
  try {
    const { workspaceId, recipients, message, templateId } = req.body;
    const logs = await SmsLog.insertMany(
      recipients.map((to: string) => ({
        workspaceId,
        to,
        message,
        templateId,
        type: "marketing",
        status: "pending",
        provider: process.env.SMS_PROVIDER || "msg91",
        sentBy: req.user!.userId,
        sentAt: new Date(),
      }))
    );
    res.status(201).json({ success: true, count: logs.length });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to send bulk SMS" });
  }
};
