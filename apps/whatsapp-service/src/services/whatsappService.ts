import { formatPhone, META_API_BASE } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { WhatsAppMessage } from "../models/WhatsAppMessage";
import { WhatsAppTemplate } from "../models/WhatsAppTemplate";
import { WhatsAppConversation } from "../models/WhatsAppConversation";

export interface SendResult {
  success: boolean;
  messageId?: string;
  waMessageId?: string;
  error?: string;
}

interface OutboundBase {
  workspaceId: string;
  accountId: string;
  to: string;
  contactId?: string;
  leadId?: string;
  sentBy?: string;
}

async function findActiveAccount(workspaceId: string, accountId: string) {
  return WhatsAppAccount.findOne({ _id: accountId, workspaceId, isActive: true });
}

async function touchConversation(params: {
  workspaceId: string;
  accountId: string;
  phone: string;
  preview: string;
}) {
  const conversation = await WhatsAppConversation.findOneAndUpdate(
    { workspaceId: params.workspaceId, accountId: params.accountId, contactPhone: params.phone },
    {
      $set: { lastOutboundAt: new Date(), lastMessagePreview: params.preview.substring(0, 200), status: "active" },
      $setOnInsert: { mode: "idle", aiEnabled: false, unreadCount: 0, metadata: {} },
    },
    { upsert: true, new: true }
  );
  return conversation;
}

async function postToMeta(account: any, msgDoc: any, payload: Record<string, unknown>): Promise<SendResult> {
  try {
    const response = await fetch(`${META_API_BASE}/${account.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
    });
    const data: any = await response.json();

    if (data.messages?.[0]?.id) {
      msgDoc.status = "sent";
      msgDoc.waMessageId = data.messages[0].id;
      await msgDoc.save();
      await WhatsAppAccount.findByIdAndUpdate(account._id, { $inc: { dailyMessageCount: 1 } });
      return { success: true, messageId: msgDoc._id.toString(), waMessageId: data.messages[0].id };
    }

    const error = data.error?.message || data.error?.error_data?.details || "Unknown Meta API error";
    msgDoc.status = "failed";
    msgDoc.errorCode = data.error?.code?.toString();
    msgDoc.errorMessage = error;
    await msgDoc.save();
    return { success: false, messageId: msgDoc._id.toString(), error };
  } catch (err: any) {
    msgDoc.status = "failed";
    msgDoc.errorMessage = err.message;
    await msgDoc.save();
    logger.error("Meta API send failed", { error: err.message });
    return { success: false, messageId: msgDoc._id.toString(), error: err.message };
  }
}

export async function sendTextMessage(params: OutboundBase & { text: string; metadata?: Record<string, unknown> }): Promise<SendResult> {
  const account = await findActiveAccount(params.workspaceId, params.accountId);
  if (!account) return { success: false, error: "WhatsApp account not found or inactive" };

  const phone = formatPhone(params.to);
  const conversation = await touchConversation({ workspaceId: params.workspaceId, accountId: params.accountId, phone, preview: params.text });

  const msgDoc = await WhatsAppMessage.create({
    workspaceId: params.workspaceId,
    accountId: params.accountId,
    conversationId: conversation._id.toString(),
    direction: "outbound",
    from: account.phoneNumber,
    to: phone,
    messageType: "text",
    content: params.text,
    status: "pending",
    contactId: params.contactId,
    leadId: params.leadId,
    assignedTo: params.sentBy,
    metadata: params.metadata || {},
    sentAt: new Date(),
  });

  return postToMeta(account, msgDoc, { to: phone, type: "text", text: { body: params.text } });
}

export async function sendTemplateMessage(params: OutboundBase & { templateName: string; language?: string; variables?: string[]; metadata?: Record<string, unknown> }): Promise<SendResult> {
  const account = await findActiveAccount(params.workspaceId, params.accountId);
  if (!account) return { success: false, error: "WhatsApp account not found or inactive" };

  const template = await WhatsAppTemplate.findOne({
    accountId: params.accountId,
    name: params.templateName,
    status: "APPROVED",
    isActive: true,
  });
  if (!template) return { success: false, error: "Template not found or not approved" };

  const phone = formatPhone(params.to);
  const conversation = await touchConversation({ workspaceId: params.workspaceId, accountId: params.accountId, phone, preview: template.bodyText });

  const components =
    params.variables && params.variables.length > 0
      ? [{ type: "body", parameters: params.variables.map((v) => ({ type: "text", text: v })) }]
      : undefined;

  const msgDoc = await WhatsAppMessage.create({
    workspaceId: params.workspaceId,
    accountId: params.accountId,
    conversationId: conversation._id.toString(),
    direction: "outbound",
    from: account.phoneNumber,
    to: phone,
    messageType: "template",
    content: template.bodyText,
    templateName: params.templateName,
    templateVariables: params.variables || [],
    status: "pending",
    contactId: params.contactId,
    leadId: params.leadId,
    assignedTo: params.sentBy,
    metadata: params.metadata || {},
    sentAt: new Date(),
  });

  const result = await postToMeta(account, msgDoc, {
    to: phone,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.language || template.language || "en" },
      ...(components ? { components } : {}),
    },
  });

  if (result.success) {
    await WhatsAppTemplate.findByIdAndUpdate(template._id, { $inc: { usageCount: 1 } });
  }
  return result;
}

export async function broadcastTemplate(params: {
  workspaceId: string;
  accountId: string;
  recipients: Array<{ phone: string; variables?: string[]; contactId?: string }>;
  templateName: string;
  language?: string;
}) {
  let sent = 0;
  let failed = 0;
  const errors: Array<{ phone: string; error: string }> = [];

  for (const recipient of params.recipients) {
    const result = await sendTemplateMessage({
      workspaceId: params.workspaceId,
      accountId: params.accountId,
      to: recipient.phone,
      templateName: params.templateName,
      language: params.language,
      variables: recipient.variables,
      contactId: recipient.contactId,
      metadata: { sentBy: "broadcast" },
    });
    if (result.success) sent++;
    else {
      failed++;
      errors.push({ phone: recipient.phone, error: result.error || "Unknown error" });
    }
    if ((sent + failed) % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return { total: params.recipients.length, sent, failed, errors };
}

export async function sendInteractiveButtons(params: OutboundBase & { bodyText: string; buttons: Array<{ id: string; title: string }> }): Promise<SendResult> {
  const account = await findActiveAccount(params.workspaceId, params.accountId);
  if (!account) return { success: false, error: "WhatsApp account not found or inactive" };

  const phone = formatPhone(params.to);
  const conversation = await touchConversation({ workspaceId: params.workspaceId, accountId: params.accountId, phone, preview: params.bodyText });

  const msgDoc = await WhatsAppMessage.create({
    workspaceId: params.workspaceId,
    accountId: params.accountId,
    conversationId: conversation._id.toString(),
    direction: "outbound",
    from: account.phoneNumber,
    to: phone,
    messageType: "interactive",
    content: params.bodyText,
    status: "pending",
    metadata: { sentBy: "bot", interactiveType: "button", buttons: params.buttons },
    sentAt: new Date(),
  });

  return postToMeta(account, msgDoc, {
    to: phone,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: params.bodyText },
      action: {
        buttons: params.buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.substring(0, 20) } })),
      },
    },
  });
}

export async function sendInteractiveList(params: OutboundBase & {
  bodyText: string;
  buttonText: string;
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>;
}): Promise<SendResult> {
  const account = await findActiveAccount(params.workspaceId, params.accountId);
  if (!account) return { success: false, error: "WhatsApp account not found or inactive" };

  const phone = formatPhone(params.to);
  const conversation = await touchConversation({ workspaceId: params.workspaceId, accountId: params.accountId, phone, preview: params.bodyText });

  const msgDoc = await WhatsAppMessage.create({
    workspaceId: params.workspaceId,
    accountId: params.accountId,
    conversationId: conversation._id.toString(),
    direction: "outbound",
    from: account.phoneNumber,
    to: phone,
    messageType: "interactive",
    content: params.bodyText,
    status: "pending",
    metadata: { sentBy: "bot", interactiveType: "list", sections: params.sections },
    sentAt: new Date(),
  });

  return postToMeta(account, msgDoc, {
    to: phone,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: params.bodyText },
      action: {
        button: params.buttonText.substring(0, 20),
        sections: params.sections.map((s) => ({
          title: s.title.substring(0, 24),
          rows: s.rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.substring(0, 24),
            ...(r.description ? { description: r.description.substring(0, 72) } : {}),
          })),
        })),
      },
    },
  });
}

export async function handleStatusUpdate(payload: { waMessageId: string; status: string; timestamp: number; errorCode?: string; errorMessage?: string }) {
  const update: Record<string, unknown> = { status: payload.status };
  if (payload.status === "delivered") update.deliveredAt = new Date(payload.timestamp * 1000);
  if (payload.status === "read") update.readByRecipientAt = new Date(payload.timestamp * 1000);
  if (payload.status === "failed") {
    update.errorCode = payload.errorCode;
    update.errorMessage = payload.errorMessage;
  }
  await WhatsAppMessage.findOneAndUpdate({ waMessageId: payload.waMessageId }, { $set: update });
}

export function buildTemplateComponents(template: any) {
  const components: Record<string, unknown>[] = [];
  if (template.headerType && template.headerType !== "NONE") {
    components.push(
      template.headerType === "TEXT"
        ? { type: "HEADER", format: "TEXT", text: template.headerContent || "" }
        : { type: "HEADER", format: template.headerType }
    );
  }
  components.push({ type: "BODY", text: template.bodyText });
  if (template.footerText) components.push({ type: "FOOTER", text: template.footerText });
  if (template.buttons?.length) {
    components.push({
      type: "BUTTONS",
      buttons: template.buttons.map((b: any) => {
        if (b.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: b.text };
        if (b.type === "URL") return { type: "URL", text: b.text, url: b.url };
        return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phoneNumber };
      }),
    });
  }
  return components;
}

export async function graphGet(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data: any = await res.json();
  if (!res.ok) {
    throw new Error(`Graph API ${res.status}: ${data?.error?.message || res.statusText}`);
  }
  return data;
}
