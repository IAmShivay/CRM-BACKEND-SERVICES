import { SERVICE_URLS, INTERNAL_KEY_HEADER } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";

export async function requestAutoReply(params: {
  workspaceId: string;
  incomingMessage: string;
  senderName?: string;
  businessName?: string;
  tone?: string;
  businessContext?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string | null> {
  try {
    const res = await fetch(`${SERVICE_URLS.MARKETING}/api/ai/internal/auto-reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY || "",
      },
      body: JSON.stringify({ ...params, channel: "whatsapp" }),
    });
    if (!res.ok) {
      logger.warn("Auto-reply request failed", { status: res.status });
      return null;
    }
    const data: any = await res.json();
    return data.reply || null;
  } catch (err: any) {
    logger.error("Auto-reply request error", { error: err.message });
    return null;
  }
}
