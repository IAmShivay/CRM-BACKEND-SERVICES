import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  socialPostSchema,
  workspaceIdSchema,
  paginationSchema,
} from "@crm-platform/shared-types";
import { getAccounts, getAccountById, createAccount, updateAccount, deleteAccount } from "../controllers/accountController";
import { getPosts, getPostById, createPost, updatePost, deletePost } from "../controllers/postController";
import { generateContent } from "../controllers/generateController";
import { initiateOAuth, handleCallback } from "../controllers/oauthController";
import {
  getIntegrations, connectFacebookLeadAds, connectGoogleAds, connectLinkedIn,
  handleMetaLeadgenWebhook, syncGoogleAdsLeads, syncLinkedInLeads,
  getSubmissions, processSubmission, deleteIntegration, getOAuthUrl
} from "../controllers/leadFormController";

const postsQuerySchema = paginationSchema.extend({
  workspaceId: workspaceIdSchema,
  status: z.string().optional(),
});

const accountsQuerySchema = z.object({
  workspaceId: workspaceIdSchema,
  platform: z.enum(["facebook", "instagram", "linkedin", "twitter"]).optional(),
});

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  platform: z.enum(["facebook", "instagram", "linkedin", "twitter"]).optional(),
  tone: z.string().max(50).optional(),
});

const oauthQuerySchema = z.object({
  platform: z.enum(["facebook", "instagram", "linkedin", "twitter"]),
  workspaceId: workspaceIdSchema,
});

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const router = Router();

router.get("/accounts", verifyToken, requirePermission("social.view"), validateQuery(accountsQuerySchema), getAccounts);
router.get("/accounts/:id", verifyToken, requirePermission("social.view"), getAccountById);
router.post("/accounts", verifyToken, requirePermission("social.create"), createAccount);
router.put("/accounts/:id", verifyToken, requirePermission("social.edit"), updateAccount);
router.delete("/accounts/:id", verifyToken, requirePermission("social.delete"), deleteAccount);

router.get("/posts", verifyToken, requirePermission("social.view"), validateQuery(postsQuerySchema), getPosts);
router.get("/posts/:id", verifyToken, requirePermission("social.view"), getPostById);
router.post("/posts", verifyToken, requirePermission("social.create"), validate(socialPostSchema), createPost);
router.put("/posts/:id", verifyToken, requirePermission("social.edit"), updatePost);
router.delete("/posts/:id", verifyToken, requirePermission("social.delete"), deletePost);

router.post("/generate", verifyToken, requirePermission("social.edit"), validate(generateSchema), generateContent);

router.get("/oauth", verifyToken, validateQuery(oauthQuerySchema), initiateOAuth);
router.get("/oauth/callback", validateQuery(oauthCallbackSchema), handleCallback);

router.get("/lead-forms/oauth-url", verifyToken, getOAuthUrl);
router.get("/lead-forms", verifyToken, requirePermission("social.view"), getIntegrations);
router.post("/lead-forms/facebook", verifyToken, requirePermission("social.create"), connectFacebookLeadAds);
router.post("/lead-forms/google", verifyToken, requirePermission("social.create"), connectGoogleAds);
router.post("/lead-forms/linkedin", verifyToken, requirePermission("social.create"), connectLinkedIn);
router.delete("/lead-forms/:id", verifyToken, requirePermission("social.delete"), deleteIntegration);
router.get("/lead-forms/submissions", verifyToken, requirePermission("social.view"), getSubmissions);
router.post("/lead-forms/submissions/:id/process", verifyToken, requirePermission("social.edit"), processSubmission);
router.post("/lead-forms/sync/google", verifyToken, requirePermission("social.edit"), syncGoogleAdsLeads);
router.post("/lead-forms/sync/linkedin", verifyToken, requirePermission("social.edit"), syncLinkedInLeads);

router.get("/webhook/leadgen", handleMetaLeadgenWebhook);
router.post("/webhook/leadgen", handleMetaLeadgenWebhook);

export default router;
