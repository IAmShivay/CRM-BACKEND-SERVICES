import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission, verifyInternalKey } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  whatsappSendSchema,
  whatsappTemplateSchema,
  broadcastSchema,
  workspaceIdSchema,
  mongoIdSchema,
  phoneSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount, connectFacebook } from "../controllers/accountController";
import { sendMessage, getMessages, broadcastMessage, sendTemplateMessage, internalSend, getMedia } from "../controllers/messageController";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, syncTemplates, submitTemplate } from "../controllers/templateController";
import { getConversations, getConversationById, updateConversation, handoffConversation } from "../controllers/conversationController";
import { getBotFlows, getBotFlowById, createBotFlow, updateBotFlow, deleteBotFlow } from "../controllers/botFlowController";
import { verifyWebhook, handleWebhook } from "../controllers/webhookController";

const router = Router();

const messagesQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  conversationId: z.string().optional(),
  contactId: z.string().optional(),
});

const sendTemplateMessageSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
  to: phoneSchema,
  templateName: z.string().min(1).max(100),
  language: z.string().max(10).optional(),
  variables: z.array(z.string()).optional(),
  contactId: mongoIdSchema.optional(),
  leadId: mongoIdSchema.optional(),
});

const syncTemplatesSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
});

const workspaceQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

const conversationsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  accountId: z.string().optional(),
  status: z.string().optional(),
  mode: z.string().optional(),
  phone: z.string().optional(),
});

const botFlowsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: z.string().optional(),
});

const handoffSchema = z.object({
  action: z.enum(["take_over", "release"]),
  assignedTo: mongoIdSchema.optional(),
  workspaceId: workspaceIdSchema.optional(),
});

const createAccountSchema = z.object({
  workspaceId: workspaceIdSchema,
  provider: z.enum(["meta_cloud", "wati", "gupshup"]).optional(),
  phoneNumberId: z.string().min(1),
  businessAccountId: z.string().optional(),
  displayName: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().min(10).max(15),
  accessToken: z.string().min(1),
  webhookVerifyToken: z.string().optional(),
  botEnabled: z.boolean().optional(),
  botContext: z.string().max(2000).optional(),
  botTone: z.enum(["professional", "friendly", "casual"]).optional(),
}).refine((d) => d.displayName || d.name, { message: "displayName is required" });

const connectFacebookSchema = z.object({
  workspaceId: workspaceIdSchema,
  accessToken: z.string().min(1),
});

const internalSendSchema = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
  to: phoneSchema,
  text: z.string().min(1).max(4096).optional(),
  templateName: z.string().min(1).max(100).optional(),
  language: z.string().max(10).optional(),
  variables: z.array(z.string()).optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  source: z.string().max(50).optional(),
}).refine((d) => d.text || d.templateName, { message: "text or templateName is required" });

router.get("/accounts", verifyToken, requirePermission("leads.view"), validateQuery(workspaceQuerySchema), getAccounts);
router.get("/accounts/:id", verifyToken, requirePermission("leads.view"), getAccountById);
router.post("/accounts", verifyToken, requirePermission("leads.create"), validate(createAccountSchema), createAccount);
router.put("/accounts/:id", verifyToken, requirePermission("leads.edit"), updateAccount);
router.delete("/accounts/:id", verifyToken, requirePermission("leads.delete"), deleteAccount);
router.post("/connect-facebook", verifyToken, requirePermission("leads.create"), validate(connectFacebookSchema), connectFacebook);

router.post("/send", verifyToken, requirePermission("leads.edit"), validate(whatsappSendSchema), sendMessage);
router.get("/messages", verifyToken, requirePermission("leads.view"), validateQuery(messagesQuerySchema), getMessages);
router.get("/media/:messageId", verifyToken, requirePermission("leads.view"), validateQuery(workspaceQuerySchema), getMedia);
router.post("/broadcast", verifyToken, requirePermission("leads.edit"), validate(broadcastSchema), broadcastMessage);
router.post("/send-template", verifyToken, requirePermission("leads.edit"), validate(sendTemplateMessageSchema), sendTemplateMessage);
router.post("/internal/send", verifyInternalKey, validate(internalSendSchema), internalSend);

router.get("/templates", verifyToken, requirePermission("leads.view"), validateQuery(workspaceQuerySchema.extend({ accountId: z.string().optional(), status: z.string().optional() })), getTemplates);
router.post("/templates", verifyToken, requirePermission("leads.create"), validate(whatsappTemplateSchema), createTemplate);
router.put("/templates/:id", verifyToken, requirePermission("leads.edit"), updateTemplate);
router.delete("/templates/:id", verifyToken, requirePermission("leads.delete"), deleteTemplate);
router.post("/templates/sync", verifyToken, requirePermission("leads.edit"), validate(syncTemplatesSchema), syncTemplates);
router.post("/templates/:id/submit", verifyToken, requirePermission("leads.edit"), submitTemplate);

router.get("/conversations", verifyToken, requirePermission("leads.view"), validateQuery(conversationsQuerySchema), getConversations);
router.get("/conversations/:id", verifyToken, requirePermission("leads.view"), getConversationById);
router.put("/conversations/:id", verifyToken, requirePermission("leads.edit"), updateConversation);
router.post("/conversations/:id/handoff", verifyToken, requirePermission("leads.edit"), validate(handoffSchema), handoffConversation);

router.get("/bot-flows", verifyToken, requirePermission("leads.view"), validateQuery(botFlowsQuerySchema), getBotFlows);
router.get("/bot-flows/:id", verifyToken, requirePermission("leads.view"), getBotFlowById);
router.post("/bot-flows", verifyToken, requirePermission("leads.create"), createBotFlow);
router.put("/bot-flows/:id", verifyToken, requirePermission("leads.edit"), updateBotFlow);
router.delete("/bot-flows/:id", verifyToken, requirePermission("leads.delete"), deleteBotFlow);

router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhook);

export default router;
