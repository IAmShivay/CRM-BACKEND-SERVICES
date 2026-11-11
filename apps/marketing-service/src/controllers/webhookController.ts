import { Request, Response } from "express";
import crypto from "crypto";
import { mongoose } from "@crm-platform/db";
import { WEBHOOK_LOG_STATUSES } from "@crm-platform/shared-types";

const CustomWebhook = mongoose.models?.CustomWebhook || mongoose.model("CustomWebhook", new mongoose.Schema(
  {
    workspaceId: { type: String, ref: "Workspace", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    secret: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    targetUrl: { type: String },
    events: [{ type: String }],
    lastTriggeredAt: { type: Date },
    triggerCount: { type: Number, default: 0 },
    createdBy: { type: String, ref: "User", required: true },
  },
  {
    collection: "webhooks",
    timestamps: true,
    toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } },
  }
));

const WebhookLog = mongoose.models?.WebhookLog || mongoose.model("WebhookLog", new mongoose.Schema(
  {
    webhookId: { type: String, ref: "CustomWebhook", required: true },
    workspaceId: { type: String, ref: "Workspace", required: true },
    payload: { type: mongoose.Schema.Types.Mixed },
    headers: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: [...WEBHOOK_LOG_STATUSES], default: WEBHOOK_LOG_STATUSES[0] },
    response: { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { transform: (_d: any, r: any) => { r.id = r._id; delete r._id; delete r.__v; return r; } },
  }
));

export const getWebhooks = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const webhooks = await CustomWebhook.find({ workspaceId }).select("-secret").sort({ createdAt: -1 });
    res.json({ success: true, webhooks });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch webhooks" });
  }
};

export const getWebhookById = async (req: Request, res: Response) => {
  try {
    const webhook = await CustomWebhook.findById(req.params.id).select("-secret");
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });
    res.json({ success: true, webhook });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch webhook" });
  }
};

export const createWebhook = async (req: Request, res: Response) => {
  try {
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await CustomWebhook.create({
      ...req.body,
      slug,
      secret,
      createdBy: (req as any).user?.userId,
    });

    res.status(201).json({ success: true, webhook, secret });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create webhook" });
  }
};

export const updateWebhook = async (req: Request, res: Response) => {
  try {
    const webhook = await CustomWebhook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });
    res.json({ success: true, webhook });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update webhook" });
  }
};

export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const webhook = await CustomWebhook.findByIdAndDelete(req.params.id);
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });
    res.json({ success: true, message: "Webhook deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete webhook" });
  }
};

export const receiveWebhook = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const webhook = await CustomWebhook.findOne({ slug, isActive: true });
    if (!webhook) return res.status(404).json({ message: "Webhook not found" });

    await WebhookLog.create({
      webhookId: (webhook as any)._id,
      workspaceId: (webhook as any).workspaceId,
      payload: req.body,
      headers: req.headers,
      status: "received",
    });

    await CustomWebhook.findByIdAndUpdate((webhook as any)._id, {
      lastTriggeredAt: new Date(),
      $inc: { triggerCount: 1 },
    });

    res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    res.status(500).json({ message: "Failed to process webhook" });
  }
};

export const getWebhookLogs = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "20" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      WebhookLog.find({ webhookId: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      WebhookLog.countDocuments({ webhookId: req.params.id }),
    ]);

    res.json({
      success: true,
      logs,
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
    res.status(500).json({ message: "Failed to fetch webhook logs" });
  }
};
