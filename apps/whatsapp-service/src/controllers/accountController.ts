import { Request, Response } from "express";
import { META_API_BASE } from "@crm-platform/shared-types";
import { WhatsAppAccount } from "../models/WhatsAppAccount";
import { graphGet } from "../services/whatsappService";

const EDITABLE_FIELDS = [
  "displayName",
  "phoneNumber",
  "phoneNumberId",
  "businessAccountId",
  "accessToken",
  "webhookVerifyToken",
  "isActive",
  "botEnabled",
  "botContext",
  "botTone",
] as const;

function pickAccountFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined && body[field] !== "") data[field] = body[field];
  }
  if (body.name !== undefined && data.displayName === undefined) data.displayName = body.name;
  return data;
}

export const getAccounts = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.query;
    const accounts = await WhatsAppAccount.find({ workspaceId, isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch accounts" });
  }
};

export const getAccountById = async (req: Request, res: Response) => {
  try {
    const account = await WhatsAppAccount.findById(req.params.id);
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, account });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch account" });
  }
};

export const createAccount = async (req: Request, res: Response) => {
  try {
    const account = await WhatsAppAccount.create({
      ...pickAccountFields(req.body),
      workspaceId: req.body.workspaceId,
      provider: req.body.provider || "meta_cloud",
      createdBy: req.user!.userId,
    });
    res.status(201).json({ success: true, account });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "This phone number is already connected" });
    }
    res.status(400).json({ message: error.message || "Failed to create account" });
  }
};

export const updateAccount = async (req: Request, res: Response) => {
  try {
    const account = await WhatsAppAccount.findByIdAndUpdate(req.params.id, pickAccountFields(req.body), {
      new: true,
      runValidators: true,
    });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, account });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update account" });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const account = await WhatsAppAccount.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json({ success: true, message: "Account disconnected" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete account" });
  }
};

export const connectFacebook = async (req: Request, res: Response) => {
  const { workspaceId, accessToken } = req.body;
  const userId = req.user!.userId;

  try {
    await graphGet(`${META_API_BASE}/me?fields=id,name`, accessToken);
  } catch (err: any) {
    return res.status(400).json({ message: "Facebook token invalid or expired. Please try again.", debug: err.message });
  }

  let businesses: Array<{ id: string; name: string }> = [];
  try {
    const bizRes = await graphGet(`${META_API_BASE}/me/businesses?fields=id,name`, accessToken);
    businesses = bizRes.data || [];
  } catch {
    businesses = [];
  }

  if (businesses.length === 0) {
    let scopes: string[] = [];
    try {
      const debugRes = await graphGet(`${META_API_BASE}/debug_token?input_token=${accessToken}`, accessToken);
      scopes = debugRes?.data?.scopes || [];
    } catch {
      scopes = [];
    }
    return res.json({
      success: true,
      accounts: [],
      message: scopes.length
        ? `No WhatsApp Business accounts found. Token scopes: ${scopes.join(", ")}. Make sure your Facebook account owns a WhatsApp Business Account.`
        : 'No business accounts found linked to this Facebook account. Use "Connect Manually" to add your WhatsApp account with a system token.',
    });
  }

  const connected: any[] = [];

  for (const biz of businesses) {
    let wabas: Array<{ id: string; name: string }> = [];
    try {
      const wabasRes = await graphGet(`${META_API_BASE}/${biz.id}/owned_whatsapp_business_accounts?fields=id,name`, accessToken);
      wabas = wabasRes.data || [];
    } catch {
      continue;
    }

    for (const waba of wabas) {
      let phones: Array<{ id: string; display_phone_number: string; verified_name: string }> = [];
      try {
        const phonesRes = await graphGet(`${META_API_BASE}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name`, accessToken);
        phones = phonesRes.data || [];
      } catch {
        continue;
      }

      for (const phone of phones) {
        const account = await WhatsAppAccount.findOneAndUpdate(
          { workspaceId, phoneNumberId: phone.id },
          {
            $set: {
              accessToken,
              businessAccountId: waba.id,
              isActive: true,
              phoneNumber: phone.display_phone_number.replace(/[^0-9]/g, ""),
            },
            $setOnInsert: {
              workspaceId,
              phoneNumberId: phone.id,
              displayName: phone.verified_name || `${biz.name} - ${phone.display_phone_number}`,
              provider: "meta_cloud",
              botEnabled: false,
              createdBy: userId,
            },
          },
          { upsert: true, new: true }
        );
        connected.push(account);
      }
    }
  }

  res.json({
    success: true,
    accounts: connected,
    message:
      connected.length > 0
        ? `Connected ${connected.length} account(s)`
        : `Found ${businesses.length} business(es) but no WhatsApp phone numbers. Add a phone number in Meta Business Suite first.`,
  });
};
