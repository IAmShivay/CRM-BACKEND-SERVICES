import { Request, Response } from "express";
import { META_API_BASE } from "@crm-platform/shared-types";
import { WhatsAppTemplate } from "../models/WhatsAppTemplate";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { buildTemplateComponents } from "../services/whatsappService";

function extractVariables(bodyText: string): string[] {
  return (bodyText.match(/\{\{\d+\}\}/g) || []).map((m) => m.replace(/\{\{|\}\}/g, ""));
}

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId, status } = req.query;

    const filter: any = { workspaceId, isActive: true };
    if (accountId) filter.accountId = accountId;
    if (status) filter.status = status;

    const templates = await WhatsAppTemplate.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch templates" });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const template = await WhatsAppTemplate.create({
      ...req.body,
      variables: extractVariables(req.body.bodyText),
      status: "PENDING",
      createdBy: req.user!.userId,
    });
    res.status(201).json({ success: true, template });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A template with this name and language already exists" });
    }
    res.status(400).json({ message: error.message || "Failed to create template" });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const template = await WhatsAppTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json({ success: true, template });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update template" });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const template = await WhatsAppTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });

    if (template.metaTemplateId) {
      const account = await WhatsAppAccount.findById(template.accountId);
      if (account?.businessAccountId) {
        await fetch(`${META_API_BASE}/${account.businessAccountId}/message_templates?name=${template.name}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }).catch(() => null);
      }
    }

    await WhatsAppTemplate.findByIdAndUpdate(template._id, { isActive: false });
    res.json({ success: true, message: "Template deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete template" });
  }
};

export const syncTemplates = async (req: Request, res: Response) => {
  try {
    const { workspaceId, accountId } = req.body;

    const account = await WhatsAppAccount.findById(accountId);
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (!account.businessAccountId) return res.status(400).json({ message: "Account has no Business Account ID" });

    const metaRes = await fetch(`${META_API_BASE}/${account.businessAccountId}/message_templates?limit=100`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    const metaData: any = await metaRes.json();
    if (!metaRes.ok) {
      return res.status(502).json({ message: metaData?.error?.message || "Failed to fetch templates from Meta" });
    }

    let synced = 0;
    for (const tpl of metaData.data || []) {
      const components = tpl.components || [];
      const headerComp = components.find((c: any) => c.type === "HEADER");
      const bodyComp = components.find((c: any) => c.type === "BODY");
      const footerComp = components.find((c: any) => c.type === "FOOTER");
      const buttonsComp = components.find((c: any) => c.type === "BUTTONS");
      const bodyText = bodyComp?.text || "";

      await WhatsAppTemplate.findOneAndUpdate(
        { accountId, name: tpl.name, language: tpl.language },
        {
          $set: {
            workspaceId,
            accountId,
            category: tpl.category,
            status: tpl.status,
            headerType: headerComp?.format || "NONE",
            headerContent: headerComp?.text || headerComp?.example?.header_handle?.[0] || "",
            bodyText,
            footerText: footerComp?.text || "",
            buttons: (buttonsComp?.buttons || []).map((b: any) => ({
              type: b.type,
              text: b.text,
              url: b.url,
              phoneNumber: b.phone_number,
            })),
            variables: extractVariables(bodyText),
            metaTemplateId: tpl.id,
            isActive: true,
          },
          $setOnInsert: { createdBy: req.user?.userId || "system" },
        },
        { upsert: true, new: true }
      );
      synced++;
    }

    res.json({ success: true, synced });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to sync templates" });
  }
};

export const submitTemplate = async (req: Request, res: Response) => {
  try {
    const template = await WhatsAppTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });

    const account = await WhatsAppAccount.findById(template.accountId);
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (!account.businessAccountId) return res.status(400).json({ message: "Account has no Business Account ID" });

    const metaRes = await fetch(`${META_API_BASE}/${account.businessAccountId}/message_templates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: template.name,
        language: template.language,
        category: template.category,
        components: buildTemplateComponents(template),
      }),
    });
    const metaData: any = await metaRes.json();

    if (!metaRes.ok) {
      return res.status(502).json({ message: metaData?.error?.message || "Failed to submit template to Meta", error: metaData?.error });
    }

    await WhatsAppTemplate.findByIdAndUpdate(template._id, { metaTemplateId: metaData.id, status: "PENDING" });

    res.json({ success: true, metaTemplateId: metaData.id });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to submit template to Meta" });
  }
};
