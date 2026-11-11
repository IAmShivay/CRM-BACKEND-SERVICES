import { SERVICE_URLS, INTERNAL_KEY_HEADER } from "@crm-platform/shared-types";

export interface WhatsAppSendParams {
  workspaceId: string;
  accountId: string;
  to: string;
  text?: string;
  templateName?: string;
  language?: string;
  variables?: string[];
  contactId?: string;
  leadId?: string;
  source: "campaign" | "sequence";
}

export async function sendWhatsApp(params: WhatsAppSendParams): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${SERVICE_URLS.WHATSAPP}/api/whatsapp/internal/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY || "",
    },
    body: JSON.stringify(params),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) return { success: false, error: data.error || data.message || `HTTP ${res.status}` };
  return { success: Boolean(data.success), error: data.error };
}
