import { LINKEDIN_OAUTH, META_OAUTH } from "@crm-platform/shared-types";

export type SocialOAuthProvider = "linkedin" | "meta";

export interface SocialTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}

export interface SocialProfile {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

const appUrl = () => process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function redirectUriFor(provider: SocialOAuthProvider) {
  return `${appUrl()}/api/oauth/${provider}/callback`;
}

function credentials(provider: SocialOAuthProvider) {
  if (provider === "linkedin") {
    return { clientId: process.env.LINKEDIN_CLIENT_ID || "", clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "" };
  }
  return { clientId: process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "", clientSecret: process.env.META_APP_SECRET || "" };
}

export function isConfigured(provider: SocialOAuthProvider) {
  const { clientId, clientSecret } = credentials(provider);
  return Boolean(clientId && clientSecret);
}

export function buildAuthUrl(provider: SocialOAuthProvider, state: string) {
  const { clientId } = credentials(provider);
  if (provider === "linkedin") {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUriFor("linkedin"),
      scope: LINKEDIN_OAUTH.SCOPES.join(" "),
      state,
    });
    return `${LINKEDIN_OAUTH.AUTHORIZE_URL}?${params}`;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriFor("meta"),
    scope: META_OAUTH.SCOPES.join(","),
    response_type: "code",
    state,
  });
  return `${META_OAUTH.AUTHORIZE_URL}?${params}`;
}

export async function exchangeCode(provider: SocialOAuthProvider, code: string): Promise<SocialTokens> {
  const { clientId, clientSecret } = credentials(provider);
  if (provider === "linkedin") {
    const res = await fetch(LINKEDIN_OAUTH.TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUriFor("linkedin"), client_id: clientId, client_secret: clientSecret }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) throw new Error(data.error_description || "LinkedIn token exchange failed");
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: Number(data.expires_in || 0) * 1000, scope: data.scope || "" };
  }
  const params = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUriFor("meta"), code });
  const res = await fetch(`${META_OAUTH.TOKEN_URL}?${params}`);
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data?.error?.message || "Meta token exchange failed");
  return { accessToken: data.access_token, expiresIn: Number(data.expires_in || META_OAUTH.DEFAULT_EXPIRES_IN) * 1000, scope: data.scope || "" };
}

export async function fetchProfile(provider: SocialOAuthProvider, accessToken: string): Promise<SocialProfile> {
  if (provider === "linkedin") {
    const res = await fetch(LINKEDIN_OAUTH.USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error("LinkedIn userinfo failed");
    return { id: data.sub, name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim(), email: data.email, picture: data.picture };
  }
  const res = await fetch(`${META_OAUTH.ME_URL}?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Meta profile failed");
  return { id: data.id, name: data.name, email: data.email };
}
