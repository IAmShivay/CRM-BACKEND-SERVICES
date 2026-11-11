import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { verifyToken } from "@crm-platform/auth-middleware";
import {
  loginSchema,
  signupSchema,
  emailSchema,
} from "@crm-platform/shared-types";
import {
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verify,
  verify2FA,
  setup2FA,
  disable2FA,
} from "../controllers/authController";
import { googleAuthStart, googleAuthCallback } from "../controllers/oauthController";

const router = Router();

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: emailSchema,
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().min(1),
});

const verify2FASchema = z.object({
  token: z.string().min(1),
});

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.get("/verify", verifyToken, verify);
router.post("/2fa/verify", verifyToken, validate(verify2FASchema), verify2FA);
router.post("/2fa/setup", verifyToken, setup2FA);
router.post("/2fa/disable", verifyToken, validate(verify2FASchema), disable2FA);
router.get("/google", googleAuthStart);
router.get("/google/callback", googleAuthCallback);

export default router;
