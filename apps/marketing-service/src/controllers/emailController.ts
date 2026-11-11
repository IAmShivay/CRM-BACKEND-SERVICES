import { Request, Response } from "express";
import { OAUTH_STATE_TTL_MS } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";
import { EmailAccount } from "../models/EmailAccount";
import { EmailMessage } from "../models/EmailMessage";
import { EmailTemplate } from "../models/EmailTemplate";
import {
  OAuthProvider,
  ProviderFolder,
  ProviderNotSupportedError,
  buildAuthUrl,
  emailProvider,
  exchangeCode,
  fetchUserInfo,
  isOAuthConfigured,
  loadAccountWithTokens,
} from "../services/emailProviders";

const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "microsoft"];

const workspaceOf = (req: Request) => String(req.query.workspaceId || req.body?.workspaceId || req.headers["x-workspace-id"] || "");

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
};

function popupHtml(type: "OAUTH_SUCCESS" | "OAUTH_ERROR", extra: Record<string, string> = {}) {
  const payload = JSON.stringify({ type, ...extra });
  const text = type === "OAUTH_SUCCESS" ? "Connected. You can close this window." : "Connection failed. You can close this window.";
  return `<!DOCTYPE html><html><body><script>window.opener && window.opener.postMessage(${payload}, "*");window.close();</script><p>${text}</p></body></html>`;
}

function failProvider(res: Response, error: unknown, fallback: string) {
  if (error instanceof ProviderNotSupportedError) return res.status(400).json({ success: false, error: error.message });
  const message = error instanceof Error ? error.message : fallback;
  return res.status(502).json({ success: false, error: message });
}

export const getEmailAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await EmailAccount.find({ workspaceId: workspaceOf(req), userId: req.user!.userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch email accounts" });
  }
};

export const getEmailAccount = async (req: Request, res: Response) => {
  try {
    const account = await EmailAccount.findOne({ _id: req.params.id, workspaceId: workspaceOf(req), isActive: true });
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch email account" });
  }
};

export const createEmailAccount = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const userId = req.user!.userId;
    const { provider, displayName, emailAddress, smtpConfig, imapConfig, settings = {} } = req.body;

    const existing = await EmailAccount.findOne({ workspaceId, emailAddress: String(emailAddress).toLowerCase(), isActive: true });
    if (existing) return res.status(400).json({ error: "This email address is already connected to this workspace" });

    const count = await EmailAccount.countDocuments({ workspaceId, userId, isActive: true });
    const account = await EmailAccount.create({
      userId,
      workspaceId,
      provider,
      displayName,
      emailAddress,
      isDefault: count === 0,
      smtpConfig,
      imapConfig,
      settings: { syncEnabled: settings.syncEnabled ?? true, syncInterval: settings.syncInterval ?? 15, signature: settings.signature || "" },
      connectionStatus: provider === "smtp" || provider === "imap" ? "not_configured" : "disconnected",
    });

    res.status(201).json({ success: true, accountId: account._id.toString(), message: "Email account created" });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create email account" });
  }
};

export const updateEmailAccount = async (req: Request, res: Response) => {
  try {
    const account = await EmailAccount.findOne({ _id: req.params.id, workspaceId: workspaceOf(req), isActive: true });
    if (!account) return res.status(404).json({ error: "Account not found" });
    const { displayName, settings, smtpConfig, imapConfig } = req.body;
    if (displayName) account.displayName = displayName;
    if (settings) account.set("settings", { ...account.get("settings"), ...settings });
    if (smtpConfig) account.set("smtpConfig", { ...(account.get("smtpConfig") || {}), ...smtpConfig });
    if (imapConfig) account.set("imapConfig", { ...(account.get("imapConfig") || {}), ...imapConfig });
    await account.save();
    res.json({ success: true, message: "Email account updated" });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to update email account" });
  }
};

export const deleteEmailAccount = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const account = await EmailAccount.findOne({ _id: req.params.id, workspaceId, isActive: true });
    if (!account) return res.status(404).json({ error: "Account not found" });
    account.isActive = false;
    account.isDefault = false;
    account.connectionStatus = "disconnected";
    await account.save();
    await EmailMessage.updateMany({ emailAccountId: account._id.toString() }, { $set: { syncStatus: "ignored" } });
    const hasDefault = await EmailAccount.exists({ workspaceId, userId: account.userId, isActive: true, isDefault: true });
    if (!hasDefault) {
      await EmailAccount.findOneAndUpdate({ workspaceId, userId: account.userId, isActive: true }, { isDefault: true }, { sort: { createdAt: 1 } });
    }
    res.json({ success: true, message: "Email account removed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete email account" });
  }
};

export const setDefaultEmailAccount = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const account = await EmailAccount.findOne({ _id: req.params.id, workspaceId, isActive: true });
    if (!account) return res.status(404).json({ error: "Account not found" });
    await EmailAccount.updateMany({ workspaceId, userId: account.userId, _id: { $ne: account._id } }, { isDefault: false });
    account.isDefault = true;
    await account.save();
    res.json({ success: true, message: "Default account updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to set default account" });
  }
};

export const syncEmailAccount = async (req: Request, res: Response) => {
  try {
    const account = await loadAccountWithTokens(req.params.id, workspaceOf(req));
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (!account.settings.syncEnabled) return res.status(400).json({ error: "Sync is disabled for this account" });
    const { folder = "INBOX", since, limit = 50 } = req.body || {};
    const count = await emailProvider.sync(account, { folder, since: since ? new Date(since) : undefined, limit: Number(limit) });
    account.settings.lastSyncAt = new Date();
    account.stats.emailsReceived += count;
    account.connectionStatus = "connected";
    await account.save();
    res.json({ success: true, count });
  } catch (error) {
    logger.warn("Email sync failed", { error: (error as Error).message });
    return failProvider(res, error, "Sync failed");
  }
};

export const testEmailAccount = async (req: Request, res: Response) => {
  try {
    const account = await loadAccountWithTokens(req.params.id, workspaceOf(req));
    if (!account) return res.status(404).json({ error: "Account not found" });
    await emailProvider.test(account);
    account.connectionStatus = "connected";
    await account.save();
    res.json({ success: true, message: "Connection successful" });
  } catch (error) {
    if (error instanceof ProviderNotSupportedError) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: false, error: error instanceof Error ? error.message : "Connection test failed" });
  }
};

export const testConnection = async (req: Request, res: Response) => {
  const { provider } = req.body;
  if (provider === "smtp" || provider === "imap") {
    return res.status(400).json({ success: false, error: `provider not supported: ${provider}` });
  }
  res.status(400).json({ success: false, error: "Use OAuth to connect Gmail or Outlook accounts" });
};

export const startEmailOAuth = async (req: Request, res: Response) => {
  const provider = req.params.provider as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) return res.status(400).json({ error: "Unsupported provider" });
  if (!isOAuthConfigured(provider)) return res.status(503).json({ error: `${provider} OAuth is not configured` });
  const workspaceId = workspaceOf(req);
  if (!workspaceId) return res.status(400).json({ error: "No workspace selected" });
  const state = Buffer.from(JSON.stringify({ userId: req.user!.userId, workspaceId, timestamp: Date.now() })).toString("base64url");
  res.json({ success: true, authUrl: buildAuthUrl(provider, state) });
};

export const emailOAuthCallback = async (req: Request, res: Response) => {
  const provider = req.params.provider as OAuthProvider;
  res.setHeader("Content-Type", "text/html");
  try {
    const code = String(req.query.code || "");
    const stateParam = String(req.query.state || "");
    if (req.query.error || !code || !stateParam || !OAUTH_PROVIDERS.includes(provider)) return res.send(popupHtml("OAUTH_ERROR"));

    let state: { userId: string; workspaceId: string; timestamp: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8"));
    } catch {
      return res.send(popupHtml("OAUTH_ERROR"));
    }
    if (!state.userId || !state.workspaceId || Date.now() - state.timestamp > OAUTH_STATE_TTL_MS) return res.send(popupHtml("OAUTH_ERROR"));

    const tokens = await exchangeCode(provider, code);
    const info = await fetchUserInfo(provider, tokens.accessToken);
    if (!info.email) return res.send(popupHtml("OAUTH_ERROR"));

    const emailProviderName = provider === "google" ? "gmail" : "outlook";
    let account = await EmailAccount.findOne({ workspaceId: state.workspaceId, emailAddress: info.email.toLowerCase() }).select("+oauthAccessToken +oauthRefreshToken");
    if (!account) {
      const count = await EmailAccount.countDocuments({ workspaceId: state.workspaceId, userId: state.userId, isActive: true });
      account = new EmailAccount({
        userId: state.userId,
        workspaceId: state.workspaceId,
        provider: emailProviderName,
        displayName: info.name || info.email,
        emailAddress: info.email,
        isDefault: count === 0,
      });
    }
    account.userId = state.userId;
    account.provider = emailProviderName;
    account.providerAccountId = info.id;
    account.oauthAccessToken = tokens.accessToken;
    if (tokens.refreshToken) account.oauthRefreshToken = tokens.refreshToken;
    account.oauthExpiresAt = new Date(Date.now() + tokens.expiresIn);
    account.oauthScope = tokens.scope;
    account.isActive = true;
    account.connectionStatus = "connected";
    await account.save();

    logger.info("Email account connected", { provider, workspaceId: state.workspaceId, accountId: account._id });
    res.send(popupHtml("OAUTH_SUCCESS", { provider, accountId: account._id.toString() }));
  } catch (error) {
    logger.error("Email OAuth callback failed", { provider, error: (error as Error).message });
    res.send(popupHtml("OAUTH_ERROR"));
  }
};

export const sendEmail = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const { accountId, to, cc, bcc, subject, text, html, body, attachments, replyTo, inReplyTo, references, priority } = req.body;
    const account = await loadAccountWithTokens(accountId, workspaceId);
    if (!account) return res.status(404).json({ error: "Email account not found" });

    const recipients = toList(to);
    if (!recipients.length) return res.status(400).json({ error: "At least one recipient is required" });

    const htmlBody = html || body;
    const result = await emailProvider.send(account, {
      to: recipients,
      cc: toList(cc),
      bcc: toList(bcc),
      subject,
      text,
      html: htmlBody,
      attachments: (attachments || []).map((a: any) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      replyTo,
      inReplyTo,
      references,
    });

    const now = new Date();
    const message = await EmailMessage.create({
      userId: req.user!.userId,
      workspaceId,
      emailAccountId: account._id.toString(),
      messageId: result.messageId,
      threadId: result.threadId,
      from: { name: account.displayName, email: account.emailAddress },
      to: recipients.map((email) => ({ email })),
      cc: toList(cc).map((email) => ({ email })),
      bcc: toList(bcc).map((email) => ({ email })),
      subject,
      bodyText: text,
      bodyHtml: htmlBody,
      snippet: String(text || htmlBody || "").replace(/<[^>]+>/g, "").slice(0, 200),
      attachments: (attachments || []).map((a: any) => ({
        filename: a.filename,
        contentType: a.contentType || "application/octet-stream",
        size: Math.floor((String(a.content || "").length * 3) / 4),
        attachmentId: `local_${Date.now()}_${a.filename}`,
      })),
      direction: "outbound",
      status: "sent",
      priority: priority || "normal",
      sentAt: now,
      receivedAt: now,
      folder: "SENT",
      isRead: true,
      syncedAt: now,
    });

    account.stats.emailsSent += 1;
    account.stats.lastUsedAt = now;
    await account.save();

    res.json({ success: true, messageId: message._id.toString(), message: "Email sent" });
  } catch (error) {
    logger.warn("Email send failed", { error: (error as Error).message });
    return failProvider(res, error, "Failed to send email");
  }
};

export const saveDraft = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const { accountId, to, cc, bcc, subject, body, attachments } = req.body;
    const account = await EmailAccount.findOne({ _id: accountId, workspaceId, isActive: true });
    if (!account) return res.status(404).json({ error: "Email account not found" });
    const draft = await EmailMessage.create({
      userId: req.user!.userId,
      workspaceId,
      emailAccountId: account._id.toString(),
      messageId: `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      from: { name: account.displayName, email: account.emailAddress },
      to: toList(to).map((email) => ({ email })),
      cc: toList(cc).map((email) => ({ email })),
      bcc: toList(bcc).map((email) => ({ email })),
      subject: subject || "(no subject)",
      bodyHtml: body,
      snippet: String(body || "").replace(/<[^>]+>/g, "").slice(0, 200),
      attachments: (attachments || []).map((a: any) => ({
        filename: a.filename,
        contentType: a.type || "application/octet-stream",
        size: a.size || 0,
        attachmentId: `draft_${Date.now()}_${a.filename}`,
      })),
      direction: "draft",
      status: "draft",
      folder: "DRAFT",
      isRead: true,
    });
    res.status(201).json({ success: true, draftId: draft._id.toString() });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to save draft" });
  }
};

export const getEmailFolders = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const account = await loadAccountWithTokens(String(req.query.accountId), workspaceId);
    if (!account) return res.status(404).json({ error: "Account not found" });

    const local = await EmailMessage.aggregate([
      { $match: { workspaceId, emailAccountId: account._id.toString() } },
      { $group: { _id: "$folder", messagesTotal: { $sum: 1 }, messagesUnread: { $sum: { $cond: ["$isRead", 0, 1] } } } },
    ]);
    const localFolders: ProviderFolder[] = local.map((f: any) => ({ id: f._id, name: f._id, type: "system", messagesTotal: f.messagesTotal, messagesUnread: f.messagesUnread }));

    let folders: ProviderFolder[] = localFolders;
    try {
      const remote = await emailProvider.folders(account);
      const seen = new Set(remote.map((f) => f.id));
      folders = [...remote, ...localFolders.filter((f) => !seen.has(f.id))];
    } catch (error) {
      if (!(error instanceof ProviderNotSupportedError)) logger.warn("Provider folders failed", { error: (error as Error).message });
    }
    res.json({ success: true, folders });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch folders" });
  }
};

export const getEmailMessages = async (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const workspaceId = workspaceOf(req);
    const page = Math.max(parseInt(q.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(q.limit || "50", 10), 1), 200);
    const folder = q.folder || "INBOX";

    const filter: any = { workspaceId, syncStatus: { $ne: "ignored" } };
    if (q.accountId) filter.emailAccountId = q.accountId;
    if (folder === "STARRED") filter.isStarred = true;
    else if (folder === "IMPORTANT") filter.isImportant = true;
    else filter.folder = folder;
    if (q.isRead === "true") filter.isRead = true;
    if (q.isRead === "false" || q.unreadOnly === "true") filter.isRead = false;
    if (q.isStarred === "true" || q.starred === "true") filter.isStarred = true;
    if (q.isImportant === "true") filter.isImportant = true;
    if (q.hasAttachments === "true") filter["attachments.0"] = { $exists: true };
    if (q.priority) filter.priority = q.priority;
    if (q.direction) filter.direction = q.direction;
    if (q.linkedToCRM === "true") filter.$or = [{ linkedLeadId: { $ne: null } }, { linkedContactId: { $ne: null } }];
    if (q.dateRange) {
      const days: Record<string, number> = { today: 1, week: 7, month: 30, quarter: 90, year: 365 };
      if (days[q.dateRange]) filter.receivedAt = { $gte: new Date(Date.now() - days[q.dateRange] * 86400000) };
    }
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$and = [{ $or: [{ subject: rx }, { "from.email": rx }, { "from.name": rx }, { snippet: rx }] }];
    }

    const [messages, total] = await Promise.all([
      EmailMessage.find(filter).select("-bodyHtml -bodyText").sort({ receivedAt: -1 }).skip((page - 1) * limit).limit(limit),
      EmailMessage.countDocuments(filter),
    ]);

    res.json({ success: true, messages, hasMore: page * limit < total, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const getEmailMessage = async (req: Request, res: Response) => {
  try {
    const message = await EmailMessage.findOne({ _id: req.params.id, workspaceId: workspaceOf(req) });
    if (!message) return res.status(404).json({ error: "Message not found" });
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch message" });
  }
};

export const updateEmailMessage = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const message = await EmailMessage.findOne({ _id: req.params.id, workspaceId });
    if (!message) return res.status(404).json({ error: "Message not found" });
    const { isRead, isStarred, folder, labels, linkedLeadId, linkedContactId, linkedProjectId, linkedTaskId, snoozeUntil } = req.body;
    const account = message.direction !== "draft" ? await loadAccountWithTokens(message.emailAccountId, workspaceId) : null;

    if (typeof isRead === "boolean") {
      message.isRead = isRead;
      message.readAt = isRead ? new Date() : undefined;
      if (account) await emailProvider.markRead(account, message.messageId, isRead).catch(() => undefined);
    }
    if (typeof isStarred === "boolean") {
      message.isStarred = isStarred;
      if (account) await emailProvider.star(account, message.messageId, isStarred).catch(() => undefined);
    }
    if (folder) message.folder = folder;
    if (Array.isArray(labels)) message.labels = labels;
    if (linkedLeadId !== undefined) message.linkedLeadId = linkedLeadId || undefined;
    if (linkedContactId !== undefined) message.linkedContactId = linkedContactId || undefined;
    if (linkedProjectId !== undefined) message.linkedProjectId = linkedProjectId || undefined;
    if (linkedTaskId !== undefined) message.linkedTaskId = linkedTaskId || undefined;
    if (snoozeUntil) {
      message.isSnoozed = true;
      message.snoozeUntil = new Date(snoozeUntil);
    } else if (snoozeUntil === null) {
      message.isSnoozed = false;
      message.snoozeUntil = undefined;
    }
    await message.save();
    res.json({ success: true, message: "Message updated" });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to update message" });
  }
};

export const deleteEmailMessage = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const message = await EmailMessage.findOne({ _id: req.params.id, workspaceId });
    if (!message) return res.status(404).json({ error: "Message not found" });
    if (message.folder === "TRASH" || message.direction === "draft") {
      await message.deleteOne();
    } else {
      const account = await loadAccountWithTokens(message.emailAccountId, workspaceId);
      if (account) await emailProvider.trash(account, message.messageId).catch(() => undefined);
      message.folder = "TRASH";
      await message.save();
    }
    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const getEmailTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await EmailTemplate.find({ workspaceId: workspaceOf(req), isActive: true }).sort({ name: 1 });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
};

export const createEmailTemplate = async (req: Request, res: Response) => {
  try {
    const template = await EmailTemplate.create({ ...req.body, workspaceId: workspaceOf(req), userId: req.user!.userId });
    res.status(201).json({ success: true, template });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create template" });
  }
};

export const getEmailAttachment = async (req: Request, res: Response) => {
  try {
    const workspaceId = workspaceOf(req);
    const attachmentId = req.params.id;
    const message = await EmailMessage.findOne({ workspaceId, "attachments.attachmentId": attachmentId });
    if (!message) return res.status(404).json({ error: "Attachment not found" });
    const meta = message.attachments.find((a: any) => a.attachmentId === attachmentId)!;
    const account = await loadAccountWithTokens(message.emailAccountId, workspaceId);
    if (!account) return res.status(404).json({ error: "Account not found" });
    const content = await emailProvider.attachment(account, message.messageId, attachmentId);
    res.setHeader("Content-Type", meta.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${meta.filename.replace(/"/g, "")}"`);
    res.send(content);
  } catch (error) {
    return failProvider(res, error, "Failed to download attachment");
  }
};
