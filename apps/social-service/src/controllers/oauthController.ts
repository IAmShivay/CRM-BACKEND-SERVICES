import { Request, Response } from "express";

export const initiateOAuth = async (req: Request, res: Response) => {
  try {
    const { platform, workspaceId } = req.query;

    const redirectUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.SOCIAL_OAUTH_REDIRECT}&state=${workspaceId}_facebook&scope=pages_show_list,pages_manage_posts`,
      instagram: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.SOCIAL_OAUTH_REDIRECT}&state=${workspaceId}_instagram&scope=instagram_basic,instagram_content_publish`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.SOCIAL_OAUTH_REDIRECT}&state=${workspaceId}_linkedin&scope=w_member_social`,
      twitter: `https://twitter.com/i/oauth2/authorize?client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${process.env.SOCIAL_OAUTH_REDIRECT}&state=${workspaceId}_twitter&scope=tweet.read+tweet.write+users.read`,
    };

    const url = redirectUrls[platform as string];
    if (!url) return res.status(400).json({ message: "Unsupported platform" });

    res.json({ success: true, authUrl: url });
  } catch (error) {
    res.status(500).json({ message: "Failed to initiate OAuth" });
  }
};

export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    res.json({ success: true, message: "OAuth callback received", code, state });
  } catch (error) {
    res.status(500).json({ message: "Failed to handle OAuth callback" });
  }
};
