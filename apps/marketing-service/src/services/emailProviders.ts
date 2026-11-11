import { GOOGLE_OAUTH, MICROSOFT_OAUTH } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";
import { EmailAccount } from "../models/EmailAccount";
import { EmailMessage, IEmailAddress } from "../models/EmailMessage";

export type OAuthProvider = "google" | "microsoft";

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
}

export interface SendOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
  replyTo?: string;
  inReplyTo?: string;
  references?: string[];
}

export interface SyncOptions {
  folder?: string;
  since?: Date;
  limit?: number;
}

export interface ProviderFolder {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

const appUrl = () => process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function redirectUriFor(provider: OAuthProvider) {
  if (provider === "google") return process.env.GOOGLE_OAUTH_REDIRECT_URI || `${appUrl()}/api/email/oauth/callback/google`;
  return process.env.MICROSOFT_OAUTH_REDIRECT_URI || `${appUrl()}/api/email/oauth/callback/microsoft`;
}

export function isOAuthConfigured(provider: OAuthProvider) {
  return provider === "google"
    ? Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
    : Boolean(process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
}

export function buildAuthUrl(provider: OAuthProvider, state: string) {
  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      redirect_uri: redirectUriFor("google"),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_OAUTH.SCOPES.join(" "),
      state,
    });
    return `${GOOGLE_OAUTH.AUTHORIZE_URL}?${params}`;
  }
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID || "",
    redirect_uri: redirectUriFor("microsoft"),
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_OAUTH.SCOPES.join(" "),
    state,
  });
  return `${MICROSOFT_OAUTH.AUTHORIZE_URL}?${params}`;
}

async function tokenRequest(provider: OAuthProvider, body: Record<string, string>): Promise<OAuthTokens> {
  const url = provider === "google" ? GOOGLE_OAUTH.TOKEN_URL : MICROSOFT_OAUTH.TOKEN_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Token request failed (${res.status})`);
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: Number(data.expires_in || 3600) * 1000, scope: data.scope };
}

export function exchangeCode(provider: OAuthProvider, code: string) {
  const creds = provider === "google"
    ? { client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "", client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "" }
    : { client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID || "", client_secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "" };
  return tokenRequest(provider, { ...creds, code, redirect_uri: redirectUriFor(provider), grant_type: "authorization_code" });
}

export function refreshTokens(provider: OAuthProvider, refreshToken: string) {
  const creds = provider === "google"
    ? { client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "", client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "" }
    : { client_id: process.env.MICROSOFT_OAUTH_CLIENT_ID || "", client_secret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "" };
  return tokenRequest(provider, { ...creds, refresh_token: refreshToken, grant_type: "refresh_token" });
}

export async function fetchUserInfo(provider: OAuthProvider, accessToken: string): Promise<{ id: string; email: string; name: string }> {
  if (provider === "google") {
    const res = await fetch(GOOGLE_OAUTH.USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error("Failed to fetch Google profile");
    return { id: data.id, email: data.email, name: data.name || data.email };
  }
  const res = await fetch(`${MICROSOFT_OAUTH.GRAPH_API_BASE}/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error("Failed to fetch Microsoft profile");
  return { id: data.id, email: data.mail || data.userPrincipalName, name: data.displayName || data.mail };
}

export function providerOf(account: any): OAuthProvider | null {
  if (account.provider === "gmail") return "google";
  if (account.provider === "outlook") return "microsoft";
  return null;
}

export class ProviderNotSupportedError extends Error {
  constructor(provider: string) {
    super(`provider not supported: ${provider}`);
  }
}

export async function loadAccountWithTokens(accountId: string, workspaceId: string) {
  return EmailAccount.findOne({ _id: accountId, workspaceId, isActive: true }).select("+oauthAccessToken +oauthRefreshToken");
}

export async function getAccessToken(account: any): Promise<string> {
  const provider = providerOf(account);
  if (!provider) throw new ProviderNotSupportedError(account.provider);
  const expired = !account.oauthExpiresAt || new Date(account.oauthExpiresAt).getTime() - Date.now() < 60_000;
  if (account.oauthAccessToken && !expired) return account.oauthAccessToken;
  if (!account.oauthRefreshToken) {
    account.connectionStatus = "expired";
    await account.save();
    throw new Error("OAuth session expired, reconnect the account");
  }
  const tokens = await refreshTokens(provider, account.oauthRefreshToken);
  account.oauthAccessToken = tokens.accessToken;
  if (tokens.refreshToken) account.oauthRefreshToken = tokens.refreshToken;
  account.oauthExpiresAt = new Date(Date.now() + tokens.expiresIn);
  account.connectionStatus = "connected";
  await account.save();
  return tokens.accessToken;
}

async function api(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (res.status === 204) return null;
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || data?.error_description || `Provider API error (${res.status})`);
  return data;
}

function parseAddress(raw: string): IEmailAddress {
  const match = raw.trim().match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].replace(/^"|"$/g, "").trim() || undefined, email: match[2].trim().toLowerCase() };
  return { email: raw.trim().toLowerCase() };
}

function parseAddressList(raw?: string): IEmailAddress[] {
  if (!raw) return [];
  return raw.split(",").map((a) => a.trim()).filter(Boolean).map(parseAddress);
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(data: string) {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function buildMime(from: string, options: SendOptions) {
  const boundary = `b_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${from}`,
    `To: ${options.to.join(", ")}`,
    ...(options.cc?.length ? [`Cc: ${options.cc.join(", ")}`] : []),
    ...(options.bcc?.length ? [`Bcc: ${options.bcc.join(", ")}`] : []),
    `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=`,
    ...(options.replyTo ? [`Reply-To: ${options.replyTo}`] : []),
    ...(options.inReplyTo ? [`In-Reply-To: ${options.inReplyTo}`] : []),
    ...(options.references?.length ? [`References: ${options.references.join(" ")}`] : []),
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  let body = headers.join("\r\n") + "\r\n\r\n";
  body += `--${boundary}\r\n`;
  if (options.html) {
    body += `Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(options.html).toString("base64")}\r\n`;
  } else {
    body += `Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(options.text || "").toString("base64")}\r\n`;
  }
  for (const att of options.attachments || []) {
    body += `--${boundary}\r\n`;
    body += `Content-Type: ${att.contentType || "application/octet-stream"}; name="${att.filename}"\r\n`;
    body += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
    body += `Content-Transfer-Encoding: base64\r\n\r\n${att.content}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return body;
}

function gmailFolder(labels: string[]) {
  if (labels.includes("DRAFT")) return "DRAFT";
  if (labels.includes("TRASH")) return "TRASH";
  if (labels.includes("SPAM")) return "SPAM";
  if (labels.includes("SENT")) return "SENT";
  return "INBOX";
}

function extractGmailBody(payload: any, acc: { text: string; html: string; attachments: any[] }) {
  if (!payload) return;
  const data = payload.body?.data;
  if (payload.filename && payload.body?.attachmentId) {
    acc.attachments.push({
      filename: payload.filename,
      contentType: payload.mimeType || "application/octet-stream",
      size: payload.body.size || 0,
      attachmentId: payload.body.attachmentId,
      isInline: Boolean(payload.headers?.some((h: any) => h.name.toLowerCase() === "content-id")),
      contentId: payload.headers?.find((h: any) => h.name.toLowerCase() === "content-id")?.value,
    });
  } else if (data) {
    const decoded = decodeBase64Url(data);
    if (payload.mimeType === "text/html") acc.html = acc.html || decoded;
    else if (payload.mimeType === "text/plain") acc.text = acc.text || decoded;
  }
  for (const part of payload.parts || []) extractGmailBody(part, acc);
}

const gmail = {
  async folders(token: string): Promise<ProviderFolder[]> {
    const data = await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/labels`);
    return (data.labels || []).map((l: any) => ({ id: l.id, name: l.name, type: l.type, messagesTotal: l.messagesTotal, messagesUnread: l.messagesUnread }));
  },
  async sync(account: any, token: string, options: SyncOptions) {
    const labels = options.folder && options.folder !== "INBOX" ? [options.folder] : ["INBOX", "SENT", "DRAFT", "STARRED"];
    const perLabel = Math.max(Math.ceil((options.limit || 50) / labels.length), 5);
    const q = options.since ? `after:${Math.floor(options.since.getTime() / 1000)}` : "";
    let count = 0;
    for (const label of labels) {
      const params = new URLSearchParams({ labelIds: label, maxResults: String(perLabel) });
      if (q) params.set("q", q);
      const list = await api(token, `${GOOGLE_API_LIST(params)}`).catch((err) => {
        logger.warn("Gmail list failed", { label, error: err.message });
        return { messages: [] };
      });
      for (const ref of list.messages || []) {
        const exists = await EmailMessage.exists({ emailAccountId: account._id.toString(), messageId: ref.id });
        if (exists) continue;
        const msg = await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/messages/${ref.id}?format=full`).catch(() => null);
        if (!msg) continue;
        const header = (name: string) => msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;
        const acc = { text: "", html: "", attachments: [] as any[] };
        extractGmailBody(msg.payload, acc);
        const labelIds: string[] = msg.labelIds || [];
        const when = new Date(parseInt(msg.internalDate || Date.now().toString(), 10));
        await EmailMessage.create({
          userId: account.userId,
          workspaceId: account.workspaceId,
          emailAccountId: account._id.toString(),
          messageId: msg.id,
          threadId: msg.threadId,
          from: parseAddress(header("From") || account.emailAddress),
          to: parseAddressList(header("To")),
          cc: parseAddressList(header("Cc")),
          bcc: parseAddressList(header("Bcc")),
          subject: header("Subject") || "(no subject)",
          bodyText: acc.text,
          bodyHtml: acc.html,
          snippet: msg.snippet,
          attachments: acc.attachments,
          direction: labelIds.includes("SENT") ? "outbound" : labelIds.includes("DRAFT") ? "draft" : "inbound",
          status: labelIds.includes("DRAFT") ? "draft" : labelIds.includes("SENT") ? "sent" : "delivered",
          sentAt: when,
          receivedAt: when,
          folder: gmailFolder(labelIds),
          labels: labelIds,
          isRead: !labelIds.includes("UNREAD"),
          isStarred: labelIds.includes("STARRED"),
          isImportant: labelIds.includes("IMPORTANT"),
          providerData: { internalDate: when, size: msg.sizeEstimate, flags: labelIds },
          syncedAt: new Date(),
        }).catch(() => null);
        count++;
      }
    }
    return count;
  },
  async send(account: any, token: string, options: SendOptions) {
    const raw = base64Url(buildMime(`${account.displayName} <${account.emailAddress}>`, options));
    const data = await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/messages/send`, { method: "POST", body: JSON.stringify({ raw }) });
    return { messageId: data.id as string, threadId: data.threadId as string };
  },
  async modify(token: string, messageId: string, add: string[], remove: string[]) {
    await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/messages/${messageId}/modify`, { method: "POST", body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }) });
  },
  async trash(token: string, messageId: string) {
    await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/messages/${messageId}/trash`, { method: "POST" });
  },
  async attachment(token: string, messageId: string, attachmentId: string) {
    const data = await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/messages/${messageId}/attachments/${attachmentId}`);
    return Buffer.from(String(data.data).replace(/-/g, "+").replace(/_/g, "/"), "base64");
  },
  async test(token: string) {
    await api(token, `${GOOGLE_OAUTH.GMAIL_API_BASE}/profile`);
  },
};

function GOOGLE_API_LIST(params: URLSearchParams) {
  return `${GOOGLE_OAUTH.GMAIL_API_BASE}/messages?${params}`;
}

function graphFolder(name: string) {
  const map: Record<string, string> = { inbox: "INBOX", sentitems: "SENT", drafts: "DRAFT", deleteditems: "TRASH", junkemail: "SPAM" };
  return map[name.replace(/\s+/g, "").toLowerCase()] || name;
}

const graph = {
  async folders(token: string): Promise<ProviderFolder[]> {
    const data = await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/mailFolders?$top=50`);
    return (data.value || []).map((f: any) => ({
      id: graphFolder(f.displayName),
      name: f.displayName,
      type: ["Inbox", "Sent Items", "Drafts", "Deleted Items", "Junk Email"].includes(f.displayName) ? "system" : "user",
      messagesTotal: f.totalItemCount,
      messagesUnread: f.unreadItemCount,
    }));
  },
  async sync(account: any, token: string, options: SyncOptions) {
    const folders = options.folder && options.folder !== "INBOX" ? [options.folder] : ["INBOX", "SENT", "DRAFT"];
    const wellKnown: Record<string, string> = { INBOX: "inbox", SENT: "sentitems", DRAFT: "drafts", TRASH: "deleteditems", SPAM: "junkemail" };
    const perFolder = Math.max(Math.ceil((options.limit || 50) / folders.length), 5);
    let count = 0;
    for (const folder of folders) {
      const params = new URLSearchParams({ $top: String(perFolder), $orderby: "receivedDateTime desc", $select: "id,conversationId,subject,from,toRecipients,ccRecipients,bccRecipients,replyTo,body,bodyPreview,hasAttachments,isRead,importance,receivedDateTime,sentDateTime,flag" });
      if (options.since) params.set("$filter", `receivedDateTime ge ${options.since.toISOString()}`);
      const list = await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/mailFolders/${wellKnown[folder] || folder}/messages?${params}`).catch((err) => {
        logger.warn("Graph list failed", { folder, error: err.message });
        return { value: [] };
      });
      for (const msg of list.value || []) {
        const exists = await EmailMessage.exists({ emailAccountId: account._id.toString(), messageId: msg.id });
        if (exists) continue;
        const addr = (r: any) => ({ name: r?.emailAddress?.name, email: (r?.emailAddress?.address || "").toLowerCase() });
        let attachments: any[] = [];
        if (msg.hasAttachments) {
          const atts = await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/messages/${msg.id}/attachments?$select=id,name,contentType,size,isInline,contentId`).catch(() => ({ value: [] }));
          attachments = (atts.value || []).map((a: any) => ({ filename: a.name, contentType: a.contentType || "application/octet-stream", size: a.size || 0, attachmentId: a.id, isInline: Boolean(a.isInline), contentId: a.contentId }));
        }
        const when = new Date(msg.receivedDateTime || msg.sentDateTime || Date.now());
        await EmailMessage.create({
          userId: account.userId,
          workspaceId: account.workspaceId,
          emailAccountId: account._id.toString(),
          messageId: msg.id,
          threadId: msg.conversationId,
          from: msg.from ? addr(msg.from) : { email: account.emailAddress },
          to: (msg.toRecipients || []).map(addr),
          cc: (msg.ccRecipients || []).map(addr),
          bcc: (msg.bccRecipients || []).map(addr),
          replyTo: msg.replyTo?.[0] ? addr(msg.replyTo[0]) : undefined,
          subject: msg.subject || "(no subject)",
          bodyText: msg.body?.contentType === "text" ? msg.body?.content : undefined,
          bodyHtml: msg.body?.contentType === "html" ? msg.body?.content : undefined,
          snippet: msg.bodyPreview,
          attachments,
          direction: folder === "SENT" ? "outbound" : folder === "DRAFT" ? "draft" : "inbound",
          status: folder === "DRAFT" ? "draft" : folder === "SENT" ? "sent" : "delivered",
          priority: msg.importance === "high" ? "high" : msg.importance === "low" ? "low" : "normal",
          sentAt: msg.sentDateTime ? new Date(msg.sentDateTime) : when,
          receivedAt: when,
          folder,
          labels: [],
          isRead: Boolean(msg.isRead),
          isStarred: msg.flag?.flagStatus === "flagged",
          isImportant: msg.importance === "high",
          providerData: { internalDate: when, conversationId: msg.conversationId },
          syncedAt: new Date(),
        }).catch(() => null);
        count++;
      }
    }
    return count;
  },
  async send(account: any, token: string, options: SendOptions) {
    const rec = (list?: string[]) => (list || []).map((email) => ({ emailAddress: { address: email } }));
    const message: any = {
      subject: options.subject,
      body: { contentType: options.html ? "HTML" : "Text", content: options.html || options.text || "" },
      toRecipients: rec(options.to),
      ccRecipients: rec(options.cc),
      bccRecipients: rec(options.bcc),
      attachments: (options.attachments || []).map((a) => ({ "@odata.type": "#microsoft.graph.fileAttachment", name: a.filename, contentType: a.contentType || "application/octet-stream", contentBytes: a.content })),
    };
    if (options.replyTo) message.replyTo = rec([options.replyTo]);
    await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/sendMail`, { method: "POST", body: JSON.stringify({ message, saveToSentItems: true }) });
    return { messageId: `graph_${Date.now()}_${Math.random().toString(36).slice(2)}`, threadId: undefined };
  },
  async markRead(token: string, messageId: string, isRead: boolean) {
    await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/messages/${messageId}`, { method: "PATCH", body: JSON.stringify({ isRead }) });
  },
  async trash(token: string, messageId: string) {
    await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/messages/${messageId}/move`, { method: "POST", body: JSON.stringify({ destinationId: "deleteditems" }) });
  },
  async attachment(token: string, messageId: string, attachmentId: string) {
    const data = await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me/messages/${messageId}/attachments/${attachmentId}`);
    return Buffer.from(String(data.contentBytes || ""), "base64");
  },
  async test(token: string) {
    await api(token, `${MICROSOFT_OAUTH.GRAPH_API_BASE}/me`);
  },
};

export const emailProvider = {
  async folders(account: any): Promise<ProviderFolder[]> {
    const p = providerOf(account);
    if (!p) throw new ProviderNotSupportedError(account.provider);
    const token = await getAccessToken(account);
    return p === "google" ? gmail.folders(token) : graph.folders(token);
  },
  async sync(account: any, options: SyncOptions): Promise<number> {
    const p = providerOf(account);
    if (!p) throw new ProviderNotSupportedError(account.provider);
    const token = await getAccessToken(account);
    return p === "google" ? gmail.sync(account, token, options) : graph.sync(account, token, options);
  },
  async send(account: any, options: SendOptions) {
    const p = providerOf(account);
    if (!p) throw new ProviderNotSupportedError(account.provider);
    const token = await getAccessToken(account);
    return p === "google" ? gmail.send(account, token, options) : graph.send(account, token, options);
  },
  async markRead(account: any, messageId: string, isRead: boolean) {
    const p = providerOf(account);
    if (!p) return;
    const token = await getAccessToken(account);
    if (p === "google") await gmail.modify(token, messageId, isRead ? [] : ["UNREAD"], isRead ? ["UNREAD"] : []);
    else await graph.markRead(token, messageId, isRead);
  },
  async star(account: any, messageId: string, isStarred: boolean) {
    const p = providerOf(account);
    if (p !== "google") return;
    const token = await getAccessToken(account);
    await gmail.modify(token, messageId, isStarred ? ["STARRED"] : [], isStarred ? [] : ["STARRED"]);
  },
  async trash(account: any, messageId: string) {
    const p = providerOf(account);
    if (!p) return;
    const token = await getAccessToken(account);
    if (p === "google") await gmail.trash(token, messageId);
    else await graph.trash(token, messageId);
  },
  async attachment(account: any, messageId: string, attachmentId: string): Promise<Buffer> {
    const p = providerOf(account);
    if (!p) throw new ProviderNotSupportedError(account.provider);
    const token = await getAccessToken(account);
    return p === "google" ? gmail.attachment(token, messageId, attachmentId) : graph.attachment(token, messageId, attachmentId);
  },
  async test(account: any) {
    const p = providerOf(account);
    if (!p) throw new ProviderNotSupportedError(account.provider);
    const token = await getAccessToken(account);
    if (p === "google") await gmail.test(token);
    else await graph.test(token);
  },
};
