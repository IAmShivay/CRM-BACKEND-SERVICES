import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { NODE_ENVS, GOOGLE_OAUTH_ENDPOINTS, GOOGLE_LOGIN_SCOPES } from "@crm-platform/shared-types";
import { Workspace, WorkspaceMember, Role } from "../models";
import { User } from "../models/User";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

const appUrl = () => process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const redirectUri = () => process.env.GOOGLE_LOGIN_REDIRECT_URI || `${appUrl()}/api/auth/google/callback`;

function loginRedirect(res: Response, error: string) {
  return res.redirect(`${appUrl()}/login?error=${encodeURIComponent(error)}`);
}

export async function googleAuthStart(req: Request, res: Response) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return res.status(503).json({ message: "Google login is not configured" });

  const mode = req.query.mode === "register" ? "register" : "login";
  const state = Buffer.from(JSON.stringify({ mode, timestamp: Date.now() })).toString("base64url");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_LOGIN_SCOPES.join(" "),
    access_type: "offline",
    prompt: "select_account",
    state,
  });
  return res.json({ url: `${GOOGLE_OAUTH_ENDPOINTS.auth}?${params.toString()}` });
}

async function createWorkspaceForUser(user: any, displayName: string) {
  const workspaceName = `${displayName}'s Workspace`;
  const slug = `${workspaceName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}-${Date.now().toString(36)}`;

  const workspace = new Workspace({ name: workspaceName, slug, planId: "free", subscriptionStatus: "trialing", createdBy: user._id });
  await workspace.save();

  const ownerRole = new Role({ workspaceId: workspace._id, name: "Owner", description: "Full access to workspace", permissions: ["*:*"], isDefault: false });
  await ownerRole.save();

  await new WorkspaceMember({ workspaceId: workspace._id, userId: user._id, roleId: ownerRole._id, status: "active", joinedAt: new Date() }).save();

  user.lastActiveWorkspaceId = workspace._id.toString();
  user.currentWorkspace = workspace._id.toString();
  await user.save();
  return workspace;
}

export async function googleAuthCallback(req: Request, res: Response) {
  try {
    const { code, error } = req.query;
    if (error) return loginRedirect(res, String(error));
    if (!code) return loginRedirect(res, "missing_code");

    const tokenRes = await fetch(GOOGLE_OAUTH_ENDPOINTS.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    const tokens: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokens.access_token) {
      logger.warn("Google token exchange failed", { error: tokens?.error_description || tokens?.error });
      return loginRedirect(res, "auth_failed");
    }

    const infoRes = await fetch(GOOGLE_OAUTH_ENDPOINTS.userinfo, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const googleUser: any = await infoRes.json().catch(() => ({}));
    if (!infoRes.ok || !googleUser.email) return loginRedirect(res, "no_email");

    const email = String(googleUser.email).toLowerCase();
    let user = (await User.findOne({ oauthProvider: "google", oauthId: googleUser.id })) || (await User.findOne({ email }));

    if (user) {
      if (!user.oauthProvider) {
        user.oauthProvider = "google";
        user.oauthId = googleUser.id;
      }
      if (!user.fullName && googleUser.name) user.fullName = googleUser.name;
      if (!user.avatarUrl && googleUser.picture) user.avatarUrl = googleUser.picture;
      user.lastSignInAt = new Date();
      user.emailConfirmed = true;
      user.emailConfirmedAt = user.emailConfirmedAt || new Date();
      await user.save();

      const membership = await WorkspaceMember.findOne({ userId: user._id, status: "active" }).sort({ createdAt: 1 });
      if (!membership) await createWorkspaceForUser(user, user.fullName || email.split("@")[0]);
    } else {
      const displayName = googleUser.name || email.split("@")[0];
      user = new User({
        email,
        password: await authService.hashPassword(`oauth_google_${googleUser.id}_${Date.now()}`),
        fullName: displayName,
        avatarUrl: googleUser.picture || undefined,
        oauthProvider: "google",
        oauthId: googleUser.id,
        emailConfirmed: true,
        emailConfirmedAt: new Date(),
        lastSignInAt: new Date(),
      });
      await user.save();
      await createWorkspaceForUser(user, displayName);
    }

    const token = authService.generateToken(user._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    logger.info("User logged in with Google", { userId: user._id, email });
    return res.redirect(`${appUrl()}/dashboard`);
  } catch (err) {
    logger.error("Google callback error", { error: err });
    return loginRedirect(res, "auth_failed");
  }
}
