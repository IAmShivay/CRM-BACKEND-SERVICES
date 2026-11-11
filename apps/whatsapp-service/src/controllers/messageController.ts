import { Request, Response } from "express";
import { META_API_BASE } from "@crm-platform/shared-types";
import { WhatsAppMessage } from "../models/WhatsAppMessage";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { sendTextMessage, sendTemplateMessage as sendTemplate, broadcastTemplate } from "../services/whatsappService";

export const getMedia = async (req: Request, res: Response) => {
  try {
    const message = await WhatsAppMessage.findOne({ _id: req.params.messageId, workspaceId: req.query.workspaceId });
    if (!message?.mediaId) return res.status(404).json({ message: "Media not found" });

    const account = await WhatsAppAccount.findById(message.accountId);
    if (!account) return res.status(404).json({ message: "Account not found" });

    const auth = { Authorization: `Bearer ${account.accessToken}` };
    const metaRes = await fetch(`${META_API_BASE}/${message.mediaId}`, { headers: auth });
    const meta: any = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok || !meta.url) {
      return res.status(502).json({ message: meta?.error?.message || "Failed to resolve media" });
    }

    const fileRes = await fetch(meta.url, { headers: auth });
    if (!fileRes.ok) return res.status(502).json({ message: "Failed to download media" });

    const body = Buffer.from(await fileRes.arrayBuffer());
    res.set({
      "Content-Type": meta.mime_type || message.mimeType || fileRes.headers.get("content-type") || "application/octet-stream",
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=3600",
      ...(message.fileName ? { "Content-Disposition": `inline; filename="${message.fileName.replace(/"/g, "")}"` } : {}),
    });
    res.send(body);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch media" });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId, to, message, contactId, leadId } = req.body;
    const result = await sendTextMessage({
      workspaceId,
      accountId,
      to,
      text: message,
      contactId,
      leadId,
      sentBy: req.user?.userId,
      metadata: { sentBy: "agent" },
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: `WhatsApp send failed: ${result.error}`, messageId: result.messageId });
    }

    res.json({ success: true, message: "WhatsApp message sent", messageId: result.messageId, waMessageId: result.waMessageId });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to send message" });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { workspaceId, conversationId, contactId, page = "1", limit = "50" } = req.query;

    const filter: any = { workspaceId };
    if (conversationId) filter.conversationId = conversationId;
    if (contactId) filter.contactId = contactId;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      WhatsAppMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      WhatsAppMessage.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limitNum);
    res.json({
      success: true,
      messages,
      pagination: { page: pageNum, limit: limitNum, total, pages, hasNext: pageNum < pages, hasPrev: pageNum > 1 },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

export const sendTemplateMessage = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId, to, templateName, language, variables, contactId, leadId } = req.body;
    const result = await sendTemplate({
      workspaceId,
      accountId,
      to,
      templateName,
      language,
      variables,
      contactId,
      leadId,
      sentBy: req.user?.userId,
      metadata: { sentBy: "agent" },
    });

    if (!result.success) {
      return res.status(502).json({ success: false, message: `Template send failed: ${result.error}`, messageId: result.messageId });
    }

    res.json({ success: true, message: "Template message sent", messageId: result.messageId, waMessageId: result.waMessageId });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to send template message" });
  }
};

export const broadcastMessage = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId, recipients, templateName, language } = req.body;
    const result = await broadcastTemplate({ workspaceId, accountId, recipients, templateName, language });
    res.json({
      success: true,
      message: `Broadcast complete: ${result.sent} sent, ${result.failed} failed`,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to broadcast" });
  }
};

export const internalSend = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId, to, text, templateName, language, variables, contactId, leadId, source } = req.body;
    const metadata = { sentBy: source || "system" };

    const result = templateName
      ? await sendTemplate({ workspaceId, accountId, to, templateName, language, variables, contactId, leadId, metadata })
      : await sendTextMessage({ workspaceId, accountId, to, text, contactId, leadId, metadata });

    res.status(result.success ? 200 : 502).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to send" });
  }
};
