import { Request, Response } from "express";
import mongoose from "mongoose";
import { formatPhone } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";
import { WhatsAppMessage } from "../models/WhatsAppMessage";
import { WhatsAppConversation } from "../models/WhatsAppConversation";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { BotFlowEngine } from "../services/botFlowEngine";
import { handleStatusUpdate, sendTextMessage } from "../services/whatsappService";
import { requestAutoReply } from "../services/aiClient";

function phoneVariants(phone: string) {
  const normalized = formatPhone(phone);
  return Array.from(new Set([phone, normalized, `+${normalized}`, normalized.replace(/^91/, ""), normalized.replace(/^91/, "0")]));
}

async function linkMessageToLeadOrContact(workspaceId: string, phone: string, messageId: string, conversationId: string) {
  const db = mongoose.connection.db!;
  const variants = phoneVariants(phone);

  const lead = await db.collection("leads").findOne({ workspaceId, phone: { $in: variants } });
  if (lead) {
    await Promise.all([
      WhatsAppMessage.findByIdAndUpdate(messageId, { $set: { leadId: lead._id.toString() } }),
      WhatsAppConversation.findByIdAndUpdate(conversationId, { $set: { contactName: lead.name } }),
    ]);
    return;
  }

  const contact = await db.collection("contacts").findOne({ workspaceId, phone: { $in: variants } });
  if (contact) {
    await Promise.all([
      WhatsAppMessage.findByIdAndUpdate(messageId, { $set: { contactId: contact._id.toString() } }),
      WhatsAppConversation.findByIdAndUpdate(conversationId, { $set: { contactName: contact.name } }),
    ]);
  }
}

async function completeActiveEnrollments(workspaceId: string, phone: string) {
  const db = mongoose.connection.db!;
  const filter = { workspaceId, phone: { $in: phoneVariants(phone) }, status: "active" };
  const update = { $set: { status: "completed", completedAt: new Date() } };
  await Promise.all([
    db.collection("campaignenrollments").updateMany(filter, update),
    db.collection("sequenceenrollments").updateMany(filter, update),
  ]);
}

async function buildConversationHistory(workspaceId: string, phone: string, accountPhone: string) {
  const recent = await WhatsAppMessage.find({
    workspaceId,
    $or: [
      { from: phone, to: accountPhone },
      { from: accountPhone, to: phone },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return recent
    .reverse()
    .map((m: any) => ({ role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const), content: m.content || "" }))
    .filter((m) => m.content);
}

function extractContent(msg: any): string {
  switch (msg.type) {
    case "text":
      return msg.text?.body || "";
    case "image":
    case "video":
    case "audio":
    case "document":
      return msg[msg.type]?.caption || `[${msg.type}]`;
    case "button":
      return msg.button?.text || msg.button?.payload || "";
    case "interactive":
      return msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || msg.interactive?.list_reply?.id || "[interactive]";
    case "location":
      return `Location: ${msg.location?.latitude}, ${msg.location?.longitude}`;
    default:
      return `[${msg.type} message]`;
  }
}

export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token) {
      const account = await WhatsAppAccount.findOne({ webhookVerifyToken: token, isActive: true });
      if (account) return res.status(200).send(challenge);
    }
    res.sendStatus(403);
  } catch (error) {
    res.sendStatus(500);
  }
};

async function processInboundMessage(msg: any, value: any) {
  const phoneNumberId = value.metadata?.phone_number_id;
  const existing = await WhatsAppMessage.findOne({ waMessageId: msg.id });
  if (existing) return;

  const account = await WhatsAppAccount.findOne({ phoneNumberId, isActive: true });
  if (!account) {
    logger.warn("Inbound message for unknown account", { phoneNumberId });
    return;
  }

  const content = extractContent(msg);
  const contactName = value.contacts?.[0]?.profile?.name;
  const accountId = account._id.toString();

  const conversation = await WhatsAppConversation.findOneAndUpdate(
    { workspaceId: account.workspaceId, accountId, contactPhone: msg.from },
    {
      $set: {
        lastInboundAt: new Date(),
        lastMessagePreview: content.substring(0, 200),
        status: "active",
        ...(contactName ? { contactName } : {}),
      },
      $inc: { unreadCount: 1 },
      $setOnInsert: { mode: account.botEnabled ? "ai" : "idle", aiEnabled: account.botEnabled, metadata: {} },
    },
    { upsert: true, new: true }
  );

  const message = await WhatsAppMessage.create({
    workspaceId: account.workspaceId,
    accountId,
    conversationId: conversation._id.toString(),
    direction: "inbound",
    from: msg.from,
    to: account.phoneNumber,
    messageType: msg.type,
    content,
    waMessageId: msg.id,
    mediaId: msg[msg.type]?.id,
    mimeType: msg[msg.type]?.mime_type,
    fileName: msg.document?.filename,
    status: "delivered",
    isRead: false,
    sentAt: new Date(parseInt(msg.timestamp) * 1000),
  });

  linkMessageToLeadOrContact(account.workspaceId, msg.from, message._id.toString(), conversation._id.toString()).catch(() => {});
  completeActiveEnrollments(account.workspaceId, msg.from).catch(() => {});

  if (conversation.mode === "human") return;
  if (!content || !["text", "interactive", "button"].includes(msg.type)) return;

  const botResult = await BotFlowEngine.processMessage({
    workspaceId: account.workspaceId,
    accountId,
    contactPhone: msg.from,
    messageContent: content,
    conversation,
  }).catch((err) => {
    logger.error("Bot flow engine error", { error: err?.message });
    return { handled: false } as { handled: boolean; response?: string };
  });

  if (botResult.handled || conversation.mode === "idle" || msg.type !== "text") return;

  const conversationHistory = await buildConversationHistory(account.workspaceId, msg.from, account.phoneNumber);
  const reply = await requestAutoReply({
    workspaceId: account.workspaceId,
    incomingMessage: content,
    senderName: contactName || msg.from,
    businessName: account.displayName,
    tone: account.botTone || "professional",
    businessContext: botResult.response || account.botContext || "",
    conversationHistory,
  });

  if (reply) {
    await sendTextMessage({
      workspaceId: account.workspaceId,
      accountId,
      to: msg.from,
      text: reply,
      metadata: { sentBy: "ai" },
    });
  }
}

export const handleWebhook = async (req: Request, res: Response) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const value = change.value;

        for (const status of value.statuses || []) {
          await handleStatusUpdate({
            waMessageId: status.id,
            status: status.status,
            timestamp: parseInt(status.timestamp),
            errorCode: status.errors?.[0]?.code?.toString(),
            errorMessage: status.errors?.[0]?.title,
          });
        }

        for (const msg of value.messages || []) {
          await processInboundMessage(msg, value).catch((err) => {
            logger.error("Inbound message processing failed", { error: err?.message });
          });
        }
      }
    }
  } catch (error: any) {
    logger.error("Webhook processing error", { error: error?.message });
  }
};
