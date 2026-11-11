import { Request, Response } from "express";
import { PushSubscription } from "../models/PushSubscription";
import { vapidPublicKey } from "../services/push";

export const getVapidPublicKey = async (_req: Request, res: Response) => {
  const publicKey = vapidPublicKey();
  if (!publicKey) return res.status(503).json({ message: "Push notifications not configured" });
  res.json({ publicKey });
};

export const subscribe = async (req: Request, res: Response) => {
  try {
    const { subscription, workspaceId } = req.body;
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: req.user!.userId,
        workspaceId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: req.headers["user-agent"],
      },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to save subscription" });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    await PushSubscription.findOneAndDelete({ endpoint: req.body.endpoint, userId: req.user!.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove subscription" });
  }
};
