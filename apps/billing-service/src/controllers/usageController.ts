import { Request, Response } from "express";
import { PLAN_LIMIT_UNLIMITED } from "@crm-platform/shared-types";
import { getWorkspaceUsage } from "../services/subscriptionService";

export const getUsage = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId || req.headers["x-workspace-id"] || "");
    if (!workspaceId) return res.status(400).json({ message: "Workspace ID required" });
    const usage = await getWorkspaceUsage(workspaceId);
    res.json({ success: true, ...usage });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch usage" });
  }
};

export const checkLimit = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId || "");
    const resource = String(req.query.resource || "");
    if (!workspaceId || !["leads", "members"].includes(resource)) {
      return res.status(400).json({ message: "workspaceId and resource are required" });
    }
    const usage = await getWorkspaceUsage(workspaceId);
    const entry = usage[resource as "leads" | "members"];
    const allowed = entry.limit === PLAN_LIMIT_UNLIMITED || entry.used < entry.limit;
    res.json({ success: true, allowed, resource, used: entry.used, limit: entry.limit, planId: usage.planId });
  } catch (error) {
    res.status(500).json({ message: "Failed to check limit" });
  }
};
