import { Request, Response } from "express";
import { OAUTH_STATE_TTL_MS, SOCIAL_OAUTH_PROVIDERS } from "@crm-platform/shared-types";
import logger from "@crm-platform/logger";
import { SocialOAuthConnection } from "../models/SocialOAuthConnection";
import { SocialOAuthProvider, buildAuthUrl, exchangeCode, fetchProfile, isConfigured } from "../services/socialOAuthProviders";

const isProvider = (value: string): value is SocialOAuthProvider => (SOCIAL_OAUTH_PROVIDERS as readonly string[]).includes(value);

function popupHtml(type: "OAUTH_SUCCESS" | "OAUTH_ERROR", extra: Record<string, string> = {}) {
  const payload = JSON.stringify({ type, ...extra });
  const text = type === "OAUTH_SUCCESS" ? "Connected. This window will close automatically." : "Connection failed. This window will close automatically.";
  return `<!DOCTYPE html><html><body><script>window.opener && window.opener.postMessage(${payload}, "*");window.close();</script><p>${text}</p></body></html>`;
}

export const startOAuth = async (req: Request, res: Response) => {
  const provider = req.params.provider;
  if (!isProvider(provider)) return res.status(400).json({ error: "Unsupported provider" });
  if (!isConfigured(provider)) return res.status(503).json({ error: `${provider} OAuth is not configured` });
  const workspaceId = String(req.query.workspaceId || req.headers["x-workspace-id"] || "");
  if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });
  const state = Buffer.from(JSON.stringify({ userId: req.user!.userId, workspaceId, timestamp: Date.now() })).toString("base64url");
  res.json({ success: true, authUrl: buildAuthUrl(provider, state) });
};

export const oauthCallback = async (req: Request, res: Response) => {
  const provider = req.params.provider;
  res.setHeader("Content-Type", "text/html");
  try {
    const code = String(req.query.code || "");
    const stateParam = String(req.query.state || "");
    if (!isProvider(provider) || req.query.error || !code || !stateParam) return res.send(popupHtml("OAUTH_ERROR"));

    let state: { userId: string; workspaceId: string; timestamp: number };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8"));
    } catch {
      return res.send(popupHtml("OAUTH_ERROR"));
    }
    if (!state.userId || !state.workspaceId || Date.now() - state.timestamp > OAUTH_STATE_TTL_MS) return res.send(popupHtml("OAUTH_ERROR"));

    const tokens = await exchangeCode(provider, code);
    const profile = await fetchProfile(provider, tokens.accessToken);

    await SocialOAuthConnection.findOneAndUpdate(
      { workspaceId: state.workspaceId, provider, providerAccountId: profile.id },
      {
        userId: state.userId,
        displayName: profile.name || profile.email || profile.id,
        email: profile.email,
        profilePicture: profile.picture,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn) : undefined,
        scopes: tokens.scope.split(/[ ,]/).filter(Boolean),
        isActive: true,
        metadata: { providerUserId: profile.id },
      },
      { upsert: true, new: true }
    );

    logger.info("Social OAuth connection saved", { provider, workspaceId: state.workspaceId });
    res.send(popupHtml("OAUTH_SUCCESS", { provider, name: profile.name || "" }));
  } catch (error) {
    logger.error("Social OAuth callback failed", { provider, error: (error as Error).message });
    res.send(popupHtml("OAUTH_ERROR"));
  }
};

export const getConnections = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId || req.headers["x-workspace-id"] || "");
    if (!workspaceId) return res.status(400).json({ error: "workspaceId required" });
    const filter: any = { workspaceId, isActive: true };
    if (req.query.provider) filter.provider = req.query.provider;
    const connections = await SocialOAuthConnection.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, connections });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch connections" });
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    const id = String(req.query.id || req.params.id || "");
    if (!id) return res.status(400).json({ error: "id required" });
    const workspaceId = String(req.query.workspaceId || req.headers["x-workspace-id"] || "");
    const connection = await SocialOAuthConnection.findOneAndUpdate({ _id: id, workspaceId }, { isActive: false }, { new: true });
    if (!connection) return res.status(404).json({ error: "Connection not found" });
    res.json({ success: true, message: "Disconnected" });
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect" });
  }
};
