import logger from "@crm-platform/logger";
import { INTERNAL_KEY_HEADER, PLAN_LIMIT_REACHED_CODE, SERVICE_URLS } from "@crm-platform/shared-types";

export interface PlanLimitResult {
  allowed: boolean;
  used?: number;
  limit?: number;
  code?: string;
  message?: string;
}

export async function checkPlanLimit(workspaceId: string, resource: "leads" | "members"): Promise<PlanLimitResult> {
  try {
    const url = `${SERVICE_URLS.BILLING}/api/payments/internal/limits?workspaceId=${encodeURIComponent(workspaceId)}&resource=${resource}`;
    const response = await fetch(url, {
      headers: { [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY || "" },
    });
    if (!response.ok) return { allowed: true };
    const data = (await response.json()) as { allowed: boolean; used: number; limit: number };
    if (data.allowed) return { allowed: true, used: data.used, limit: data.limit };
    return {
      allowed: false,
      used: data.used,
      limit: data.limit,
      code: PLAN_LIMIT_REACHED_CODE,
      message: `${resource === "leads" ? "Lead" : "Member"} limit reached (${data.limit}). Upgrade your plan to add more.`,
    };
  } catch (error: any) {
    logger.warn("Plan limit check skipped", { resource, workspaceId, error: error?.message });
    return { allowed: true };
  }
}
