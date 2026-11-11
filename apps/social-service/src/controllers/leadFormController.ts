import { Request, Response } from "express";
import { SERVICE_URLS, INTERNAL_KEY_HEADER } from "@crm-platform/shared-types";
import mongoose from "mongoose";
import { LeadFormIntegration } from "../models/LeadFormIntegration";
import { LeadFormSubmission } from "../models/LeadFormSubmission";

export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const integrations = await LeadFormIntegration.find({ workspaceId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, integrations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch integrations" });
  }
};

export const connectFacebookLeadAds = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accessToken, pageId, pageName } = req.body;

    const integration = await LeadFormIntegration.create({
      workspaceId,
      platform: "facebook",
      accountId: pageId,
      accountName: pageName || "",
      accessToken,
      pageId,
      pageName,
      createdBy: (req as any).user?.id,
    });

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${pageId}/subscribed_apps`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscribed_fields: "leadgen" }),
      });

      if (response.ok) {
        integration.webhookSubscribed = true;
        await integration.save();
      }
    } catch {
      // webhook subscription failed but integration was created
    }

    res.status(201).json({ success: true, integration });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to connect Facebook Lead Ads" });
  }
};

export const connectGoogleAds = async (req: Request, res: Response) => {
  try {
    const { workspaceId, code, redirectUri } = req.body;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({ message: "Failed to exchange authorization code" });
    }

    const integration = await LeadFormIntegration.create({
      workspaceId,
      platform: "google_ads",
      accountId: tokenData.sub || workspaceId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
      createdBy: (req as any).user?.id,
    });

    res.status(201).json({ success: true, integration });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to connect Google Ads" });
  }
};

export const connectLinkedIn = async (req: Request, res: Response) => {
  try {
    const { workspaceId, code, redirectUri } = req.body;

    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID || "",
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json({ message: "Failed to exchange authorization code" });
    }

    const integration = await LeadFormIntegration.create({
      workspaceId,
      platform: "linkedin",
      accountId: workspaceId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined,
      createdBy: (req as any).user?.id,
    });

    res.status(201).json({ success: true, integration });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to connect LinkedIn" });
  }
};

export const handleMetaLeadgenWebhook = async (req: Request, res: Response) => {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  try {
    const { entry } = req.body;

    if (!entry || !Array.isArray(entry)) {
      return res.status(200).send("EVENT_RECEIVED");
    }

    for (const page of entry) {
      const pageId = page.id;

      if (!page.changes) continue;

      for (const change of page.changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) continue;

        const integration = await LeadFormIntegration.findOne({
          pageId,
          platform: "facebook",
          isActive: true,
        });

        if (!integration) continue;

        try {
          const leadResponse = await fetch(
            `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${integration.accessToken}`
          );
          const leadData: any = await leadResponse.json();

          const fieldData = (leadData.field_data || []).map((f: any) => ({
            name: f.name,
            value: Array.isArray(f.values) ? f.values[0] : f.values,
          }));

          await LeadFormSubmission.create({
            workspaceId: integration.workspaceId,
            integrationId: integration._id,
            platform: "facebook",
            formId: change.value?.form_id || "",
            externalLeadId: leadgenId,
            fieldData,
            rawPayload: leadData,
            status: "pending",
          });
        } catch {
          // failed to fetch or save individual lead
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } catch {
    res.status(200).send("EVENT_RECEIVED");
  }
};

export const syncGoogleAdsLeads = async (req: Request, res: Response) => {
  try {
    const { workspaceId, integrationId } = req.body;

    const integration = await LeadFormIntegration.findOne({
      _id: integrationId,
      workspaceId,
      platform: "google_ads",
      isActive: true,
    });

    if (!integration) {
      return res.status(404).json({ message: "Integration not found" });
    }

    res.json({ success: true, message: "Sync initiated", synced: 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync Google Ads leads" });
  }
};

export const syncLinkedInLeads = async (req: Request, res: Response) => {
  try {
    const { workspaceId, integrationId } = req.body;

    const integration = await LeadFormIntegration.findOne({
      _id: integrationId,
      workspaceId,
      platform: "linkedin",
      isActive: true,
    });

    if (!integration) {
      return res.status(404).json({ message: "Integration not found" });
    }

    const adAccountId = integration.adAccountId;
    if (!adAccountId) {
      return res.status(400).json({ message: "No ad account ID configured" });
    }

    const response = await fetch(
      `https://api.linkedin.com/v2/leadFormResponses?q=owner&owner=urn:li:sponsoredAccount:${adAccountId}`,
      {
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
        },
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      return res.status(400).json({ message: "Failed to fetch LinkedIn leads" });
    }

    let synced = 0;
    const elements = data.elements || [];

    for (const element of elements) {
      const externalLeadId = element.id || element.leadFormResponse?.id;

      const exists = await LeadFormSubmission.findOne({ externalLeadId });
      if (exists) continue;

      const fieldData = (element.answers || []).map((a: any) => ({
        name: a.questionId || a.name,
        value: a.answerText || a.value,
      }));

      await LeadFormSubmission.create({
        workspaceId: integration.workspaceId,
        integrationId: integration._id,
        platform: "linkedin",
        formId: element.formId || "",
        externalLeadId,
        fieldData,
        rawPayload: element,
        status: "pending",
      });

      synced++;
    }

    integration.lastSyncAt = new Date();
    await integration.save();

    res.json({ success: true, message: "Sync completed", synced });
  } catch (error) {
    res.status(500).json({ message: "Failed to sync LinkedIn leads" });
  }
};

export const getSubmissions = async (req: Request, res: Response) => {
  try {
    const { workspaceId, platform, status, page = "1", limit = "20" } = req.query;

    const filter: any = { workspaceId };
    if (platform) filter.platform = platform;
    if (status) filter.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [submissions, total] = await Promise.all([
      LeadFormSubmission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      LeadFormSubmission.countDocuments(filter),
    ]);

    res.json({
      success: true,
      submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch submissions" });
  }
};

export const processSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.body;

    const submission = await LeadFormSubmission.findOne({ _id: id, workspaceId });

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (submission.status === "processed") {
      return res.status(400).json({ message: "Submission already processed" });
    }

    const leadData: any = {
      workspaceId: submission.workspaceId,
      source: `${submission.platform}_lead_form`,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const field of submission.fieldData) {
      const name = field.name?.toLowerCase() || "";
      if (name.includes("email")) leadData.email = field.value;
      else if (name.includes("phone")) leadData.phone = field.value;
      else if (name.includes("first") && name.includes("name")) leadData.firstName = field.value;
      else if (name.includes("last") && name.includes("name")) leadData.lastName = field.value;
      else if (name.includes("full") && name.includes("name")) leadData.name = field.value;
      else if (name === "name") leadData.name = field.value;
      else if (name.includes("company")) leadData.company = field.value;
    }

    if (!leadData.name && leadData.firstName) {
      leadData.name = `${leadData.firstName} ${leadData.lastName || ""}`.trim();
    }

    const db = mongoose.connection.db;
    const result = await db!.collection("leads").insertOne(leadData);

    submission.status = "processed";
    submission.processedAt = new Date();
    submission.crmLeadId = result.insertedId.toString();
    await submission.save();

    fetch(`${SERVICE_URLS.SALES}/api/deals/internal/from-lead`, {
      method: "POST",
      headers: { "Content-Type": "application/json", [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY || "" },
      body: JSON.stringify({ leadId: submission.crmLeadId }),
    }).catch(() => null);

    res.json({ success: true, lead: { _id: result.insertedId, ...leadData } });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to process submission" });
  }
};

export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const integration = await LeadFormIntegration.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!integration) return res.status(404).json({ message: "Integration not found" });
    res.json({ success: true, message: "Integration disconnected" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete integration" });
  }
};

export const getOAuthUrl = async (req: Request, res: Response) => {
  try {
    const { platform, workspaceId, redirectUri } = req.query;

    let url = "";

    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri as string)}&scope=pages_manage_ads,leads_retrieval,pages_read_engagement`;
        break;
      case "google_ads":
        url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_ADS_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri as string)}&scope=https://www.googleapis.com/auth/adwords&response_type=code&access_type=offline`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/oauth/v2/authorization?client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri as string)}&scope=r_ads_leadgen_automation,r_organization_social&response_type=code`;
        break;
      default:
        return res.status(400).json({ message: "Unsupported platform" });
    }

    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate OAuth URL" });
  }
};
