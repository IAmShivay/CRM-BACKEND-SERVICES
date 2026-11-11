import { Request, Response } from "express";
import mongoose from "mongoose";
import { CallSettings } from "../models/CallSettings";
import { CallLog } from "../models/CallLog";

if (!mongoose.models.User) {
  mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String,
  }));
}

export const getCallSettings = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const settings = await CallSettings.findOne({ workspaceId });
    res.json({ success: true, settings: settings || null });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch call settings" });
  }
};

export const updateCallSettings = async (req: Request, res: Response) => {
  try {
    const { workspaceId, provider, apiKey, apiSecret, callerId, webhookUrl } = req.body;
    const settings = await CallSettings.findOneAndUpdate(
      { workspaceId },
      {
        workspaceId,
        provider,
        apiKey,
        apiSecret,
        callerId,
        webhookUrl,
        isActive: true,
        createdBy: (req as any).user?.userId,
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ message: "Failed to update call settings" });
  }
};

export const initiateCall = async (req: Request, res: Response) => {
  try {
    const { workspaceId, to, from, leadId, contactId } = req.body;
    const settings = await CallSettings.findOne({ workspaceId }).lean();

    if (!settings || !settings.isActive) {
      return res.status(400).json({ message: "Call settings not configured or inactive" });
    }

    let callId: string | undefined;

    if (settings.provider === "telecmi") {
      try {
        const response = await fetch("https://rest.telecmi.com/v2/calls", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.apiKey}`,
          },
          body: JSON.stringify({
            from: from || settings.callerId,
            to,
            api_key: settings.apiKey,
            api_secret: settings.apiSecret,
          }),
        });
        const data: any = await response.json();
        callId = data?.call_id || data?.callId;
      } catch (err) {
        return res.status(500).json({ message: "Failed to initiate call via TeleCMI" });
      }
    }

    const log = await CallLog.create({
      workspaceId,
      callId,
      direction: "outbound",
      from: from || settings.callerId,
      to,
      status: "initiated",
      leadId,
      contactId,
      initiatedBy: (req as any).user?.userId,
    });

    res.json({ success: true, callId: log.callId || log._id });
  } catch (error) {
    res.status(500).json({ message: "Failed to initiate call" });
  }
};

export const getCallLogs = async (req: Request, res: Response) => {
  try {
    const { workspaceId, page = "1", limit = "20" } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { workspaceId };

    const [logs, total] = await Promise.all([
      CallLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CallLog.countDocuments(filter),
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
    res.status(500).json({ message: "Failed to fetch call logs" });
  }
};
