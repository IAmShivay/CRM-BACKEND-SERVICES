import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission, verifyInternalKey } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  mongoIdSchema,
  campaignStepSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  enrollInCampaign,
  bulkEnroll,
} from "../controllers/campaignController";
import {
  getSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  deleteSequence,
  enrollInSequence,
} from "../controllers/sequenceController";
import {
  getSmsLogs,
  sendSms,
  getSmsTemplates,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  sendBulkSms,
} from "../controllers/smsController";
import { processCampaigns, processSequences } from "../controllers/cronController";
import {
  getEmailAccounts,
  getEmailAccount,
  createEmailAccount,
  updateEmailAccount,
  deleteEmailAccount,
  setDefaultEmailAccount,
  syncEmailAccount,
  testEmailAccount,
  testConnection as testEmailConnection,
  startEmailOAuth,
  emailOAuthCallback,
  sendEmail,
  saveDraft,
  getEmailFolders,
  getEmailMessages,
  getEmailMessage,
  updateEmailMessage,
  deleteEmailMessage,
  getEmailTemplates,
  createEmailTemplate,
  getEmailAttachment,
} from "../controllers/emailController";
import {
  generateAutoReply,
  generateEmail,
  suggestSubjectLine,
} from "../controllers/aiController";
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  getCatalog,
  executeWorkflow,
  syncWorkflows,
  getUsage,
  getBillingHistory,
  getExecutions,
  getExecutionById,
  getPendingInputs,
  validateApiKey,
  testConnection,
  getWorkflowDetails,
  getExecutionInput,
  submitExecutionInput,
} from "../controllers/engineController";
import {
  getWebhooks,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  receiveWebhook,
  getWebhookLogs,
} from "../controllers/webhookController";

const campaignsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  status: z.string().optional(),
});

const createCampaignSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  type: z.enum(["email", "whatsapp", "sms", "multi_channel"]).default("email"),
  status: z.enum(["draft", "active", "paused", "completed"]).default("draft"),
  steps: z.array(campaignStepSchema).optional(),
  scheduledAt: z.string().datetime().optional(),
  settings: z.record(z.any()).optional(),
});

const createSequenceSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  status: z.enum(["draft", "active", "paused", "completed"]).default("draft"),
  steps: z.array(campaignStepSchema).optional(),
  settings: z.record(z.any()).optional(),
});

const bulkEnrollSchema = z.object({
  enrollments: z.array(z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    contactId: mongoIdSchema.optional(),
    leadId: mongoIdSchema.optional(),
    variables: z.record(z.string()).optional(),
  })).min(1),
});

const router = Router();

router.get("/campaigns", verifyToken, requirePermission("campaigns.view"), validateQuery(campaignsQuerySchema), getCampaigns);
router.get("/campaigns/:id", verifyToken, requirePermission("campaigns.view"), getCampaignById);
router.post("/campaigns", verifyToken, requirePermission("campaigns.create"), validate(createCampaignSchema), createCampaign);
router.put("/campaigns/:id", verifyToken, requirePermission("campaigns.edit"), updateCampaign);
router.delete("/campaigns/:id", verifyToken, requirePermission("campaigns.delete"), deleteCampaign);
router.post("/campaigns/:campaignId/enroll", verifyToken, requirePermission("campaigns.edit"), enrollInCampaign);
router.post("/campaigns/:campaignId/bulk-enroll", verifyToken, requirePermission("campaigns.edit"), validate(bulkEnrollSchema), bulkEnroll);

router.get("/email-sequences", verifyToken, requirePermission("campaigns.view"), validateQuery(campaignsQuerySchema), getSequences);
router.get("/email-sequences/:id", verifyToken, requirePermission("campaigns.view"), getSequenceById);
router.post("/email-sequences", verifyToken, requirePermission("campaigns.create"), validate(createSequenceSchema), createSequence);
router.put("/email-sequences/:id", verifyToken, requirePermission("campaigns.edit"), updateSequence);
router.delete("/email-sequences/:id", verifyToken, requirePermission("campaigns.delete"), deleteSequence);
router.post("/email-sequences/:sequenceId/enroll", verifyToken, requirePermission("campaigns.edit"), enrollInSequence);

router.get("/sms/logs", verifyToken, requirePermission("campaigns.view"), getSmsLogs);
router.post("/sms/send", verifyToken, requirePermission("campaigns.edit"), sendSms);
const bulkSmsSchema = z.object({
  workspaceId: workspaceIdSchema,
  recipients: z.array(z.string().min(10).max(15)).min(1).max(500),
  message: z.string().min(1).max(1000),
  templateId: z.string().optional(),
});
router.post("/sms/bulk", verifyToken, requirePermission("campaigns.edit"), validate(bulkSmsSchema), sendBulkSms);
router.get("/sms/templates", verifyToken, requirePermission("campaigns.view"), getSmsTemplates);
router.post("/sms/templates", verifyToken, requirePermission("campaigns.create"), createSmsTemplate);
router.put("/sms/templates/:id", verifyToken, requirePermission("campaigns.edit"), updateSmsTemplate);
router.delete("/sms/templates/:id", verifyToken, requirePermission("campaigns.delete"), deleteSmsTemplate);

router.post("/cron/process-campaigns", processCampaigns);
router.post("/cron/process-sequences", processSequences);

const credentialsSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean().default(true),
  username: z.string().optional(),
  password: z.string().optional(),
});

const emailAccountSchema = z.object({
  provider: z.enum(["gmail", "outlook", "smtp", "imap"]),
  displayName: z.string().min(1).max(100),
  emailAddress: z.string().email(),
  smtpConfig: credentialsSchema.optional(),
  imapConfig: credentialsSchema.optional(),
  settings: z
    .object({
      syncEnabled: z.boolean().optional(),
      syncInterval: z.coerce.number().min(5).max(1440).optional(),
      signature: z.string().max(2000).optional(),
    })
    .optional(),
});

const updateEmailAccountSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  settings: z
    .object({
      syncEnabled: z.boolean().optional(),
      syncInterval: z.coerce.number().min(5).max(1440).optional(),
      signature: z.string().max(2000).optional(),
      autoReply: z.boolean().optional(),
      autoReplyMessage: z.string().max(2000).optional(),
    })
    .optional(),
  smtpConfig: credentialsSchema.partial().optional(),
  imapConfig: credentialsSchema.partial().optional(),
});

const recipientsSchema = z.union([z.string(), z.array(z.string())]);

const sendEmailSchema = z.object({
  accountId: mongoIdSchema,
  to: recipientsSchema,
  cc: recipientsSchema.optional(),
  bcc: recipientsSchema.optional(),
  subject: z.string().min(1).max(500),
  text: z.string().optional(),
  html: z.string().optional(),
  body: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  attachments: z.array(z.object({ filename: z.string().min(1), content: z.string().min(1), contentType: z.string().optional() })).max(10).optional(),
  replyTo: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  scheduleDate: z.string().optional(),
});

const draftSchema = z
  .object({
    accountId: mongoIdSchema,
    to: recipientsSchema.optional(),
    cc: recipientsSchema.optional(),
    bcc: recipientsSchema.optional(),
    subject: z.string().max(500).optional(),
    body: z.string().optional(),
    attachments: z.array(z.object({ filename: z.string(), size: z.number().optional(), type: z.string().optional() })).optional(),
  })
  .passthrough();

const testConnectionSchema = z.object({
  provider: z.enum(["smtp", "imap", "gmail", "outlook"]),
  config: credentialsSchema.partial().optional(),
});

const emailTemplateSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional(),
  category: z.enum(["sales", "marketing", "support", "onboarding", "follow-up", "custom"]).optional(),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1),
  bodyText: z.string().optional(),
  variables: z.array(z.object({ name: z.string(), placeholder: z.string(), defaultValue: z.string().optional(), required: z.boolean().optional(), type: z.string().optional() })).optional(),
});

const emailFoldersQuery = z.object({
  workspaceId: workspaceIdSchema,
  accountId: mongoIdSchema,
});

router.get("/email/accounts", verifyToken, requirePermission("campaigns.view"), getEmailAccounts);
router.post("/email/accounts", verifyToken, requirePermission("campaigns.create"), validate(emailAccountSchema), createEmailAccount);
router.get("/email/accounts/:id", verifyToken, requirePermission("campaigns.view"), getEmailAccount);
router.put("/email/accounts/:id", verifyToken, requirePermission("campaigns.edit"), validate(updateEmailAccountSchema), updateEmailAccount);
router.delete("/email/accounts/:id", verifyToken, requirePermission("campaigns.delete"), deleteEmailAccount);
router.post("/email/accounts/:id/set-default", verifyToken, requirePermission("campaigns.edit"), setDefaultEmailAccount);
router.post("/email/accounts/:id/sync", verifyToken, requirePermission("campaigns.edit"), syncEmailAccount);
router.post("/email/accounts/:id/test", verifyToken, requirePermission("campaigns.view"), testEmailAccount);
router.post("/email/test-connection", verifyToken, requirePermission("campaigns.view"), validate(testConnectionSchema), testEmailConnection);
router.get("/email/oauth/callback/:provider", emailOAuthCallback);
router.get("/email/oauth/:provider", verifyToken, requirePermission("campaigns.create"), startEmailOAuth);
router.post("/email/send", verifyToken, requirePermission("campaigns.edit"), validate(sendEmailSchema), sendEmail);
router.post("/email/drafts", verifyToken, requirePermission("campaigns.edit"), validate(draftSchema), saveDraft);
router.get("/email/folders", verifyToken, requirePermission("campaigns.view"), validateQuery(emailFoldersQuery), getEmailFolders);
router.get("/email/templates", verifyToken, requirePermission("campaigns.view"), getEmailTemplates);
router.post("/email/templates", verifyToken, requirePermission("campaigns.create"), validate(emailTemplateSchema), createEmailTemplate);
router.get("/email/attachments/:id", verifyToken, requirePermission("campaigns.view"), getEmailAttachment);
router.get("/email/messages", verifyToken, requirePermission("campaigns.view"), getEmailMessages);
router.get("/email/messages/:id", verifyToken, requirePermission("campaigns.view"), getEmailMessage);
router.put("/email/messages/:id", verifyToken, requirePermission("campaigns.edit"), updateEmailMessage);
router.delete("/email/messages/:id", verifyToken, requirePermission("campaigns.delete"), deleteEmailMessage);

const autoReplySchema = z.object({
  workspaceId: workspaceIdSchema,
  channel: z.enum(["whatsapp", "sms", "email"]).default("whatsapp"),
  incomingMessage: z.string().min(1).optional(),
  originalMessage: z.string().min(1).optional(),
  senderName: z.string().optional(),
  businessName: z.string().optional(),
  businessContext: z.string().optional(),
  context: z.string().optional(),
  tone: z.enum(["professional", "friendly", "casual"]).default("professional"),
  conversationHistory: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(5)
    .optional(),
}).refine((d) => d.incomingMessage || d.originalMessage, { message: "incomingMessage is required" });

const generateEmailSchema = z.object({
  workspaceId: workspaceIdSchema,
  purpose: z.string().optional(),
  recipientName: z.string().optional(),
  senderName: z.string().optional(),
  tone: z.enum(["professional", "friendly", "casual"]).default("professional"),
  keyPoints: z.array(z.string()).optional(),
});

const suggestSubjectSchema = z.object({
  workspaceId: workspaceIdSchema,
  body: z.string().optional(),
  purpose: z.string().optional(),
});

router.post("/ai/auto-reply", verifyToken, requirePermission("campaigns.edit"), validate(autoReplySchema), generateAutoReply);
router.post("/ai/internal/auto-reply", verifyInternalKey, validate(autoReplySchema), generateAutoReply);
router.post("/ai/generate-email", verifyToken, requirePermission("campaigns.edit"), validate(generateEmailSchema), generateEmail);
router.post("/ai/suggest-subject", verifyToken, requirePermission("campaigns.edit"), validate(suggestSubjectSchema), suggestSubjectLine);

const createApiKeySchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
});

const executeWorkflowSchema = z.object({
  workspaceId: workspaceIdSchema,
  data: z.record(z.any()).optional(),
});

const syncWorkflowsSchema = z.object({
  workspaceId: workspaceIdSchema,
  n8nApiKeyId: mongoIdSchema,
});

const engineQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
});

router.get("/engines/api-keys", verifyToken, requirePermission("campaigns.view"), validateQuery(engineQuerySchema), getApiKeys);
router.post("/engines/api-keys", verifyToken, requirePermission("campaigns.create"), validate(createApiKeySchema), createApiKey);
router.put("/engines/api-keys/:id", verifyToken, requirePermission("campaigns.edit"), updateApiKey);
router.delete("/engines/api-keys/:id", verifyToken, requirePermission("campaigns.delete"), deleteApiKey);
router.get("/engines/catalog", verifyToken, requirePermission("campaigns.view"), validateQuery(engineQuerySchema), getCatalog);
router.post("/engines/execute/:workflowId", verifyToken, requirePermission("campaigns.edit"), validate(executeWorkflowSchema), executeWorkflow);
router.post("/engines/sync", verifyToken, requirePermission("campaigns.edit"), validate(syncWorkflowsSchema), syncWorkflows);
router.get("/engines/usage", verifyToken, requirePermission("campaigns.view"), getUsage);
router.get("/engines/billing", verifyToken, requirePermission("campaigns.view"), getBillingHistory);
router.get("/engines/executions", verifyToken, requirePermission("campaigns.view"), getExecutions);
router.get("/engines/sync", verifyToken, testConnection);
router.post("/engines/api-keys/validate", verifyToken, validateApiKey);
router.get("/engines/workflow/:id", verifyToken, getWorkflowDetails);
router.get("/engines/executions/:id/input", verifyToken, getExecutionInput);
router.post("/engines/executions/:id/input", verifyToken, submitExecutionInput);
router.get("/engines/executions/:id", verifyToken, requirePermission("campaigns.view"), getExecutionById);
router.get("/engines/input/pending", verifyToken, requirePermission("campaigns.view"), getPendingInputs);

const createWebhookSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  targetUrl: z.string().url().optional(),
  events: z.array(z.string()).optional(),
});

router.get("/webhooks", verifyToken, requirePermission("campaigns.view"), validateQuery(engineQuerySchema), getWebhooks);
router.get("/webhooks/:id", verifyToken, requirePermission("campaigns.view"), getWebhookById);
router.post("/webhooks", verifyToken, requirePermission("campaigns.create"), validate(createWebhookSchema), createWebhook);
router.put("/webhooks/:id", verifyToken, requirePermission("campaigns.edit"), updateWebhook);
router.delete("/webhooks/:id", verifyToken, requirePermission("campaigns.delete"), deleteWebhook);
router.post("/webhooks/receive/:slug", receiveWebhook);
router.get("/webhooks/:id/logs", verifyToken, requirePermission("campaigns.view"), getWebhookLogs);

export default router;
