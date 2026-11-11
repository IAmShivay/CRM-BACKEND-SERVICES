import crypto from "crypto";
import { Request, Response } from "express";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import logger from "@crm-platform/logger";
import { NODE_ENVS } from "@crm-platform/shared-types";
import {
  Workspace,
  WorkspaceMember,
  Role,
} from "../models";
import { User } from "../models/User";
import { AuthService } from "../services/AuthService";

const authService = new AuthService();

export async function signup(req: Request, res: Response) {
  try {
    const { email, password, fullName, workspaceName } = req.body;

    const existingUser = await authService.findByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await authService.hashPassword(password);

    const user = new User({
      email,
      password: hashedPassword,
      fullName,
      emailConfirmed: false,
    });
    await user.save();

    let workspace = null;
    if (workspaceName) {
      const slug = workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");

      workspace = new Workspace({
        name: workspaceName,
        slug,
        planId: "free",
        subscriptionStatus: "trialing",
        createdBy: user._id,
      });
      await workspace.save();

      const ownerRole = new Role({
        workspaceId: workspace._id,
        name: "Owner",
        description: "Full access to workspace",
        permissions: ["*:*"],
        isDefault: false,
      });
      await ownerRole.save();

      const member = new WorkspaceMember({
        workspaceId: workspace._id,
        userId: user._id,
        roleId: ownerRole._id,
        status: "active",
        joinedAt: new Date(),
      });
      await member.save();
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await authService.updateById(user._id, {
      emailConfirmed: false,
      emailVerificationOtp: otp,
      emailVerificationExpires: otpExpires,
    });

    logger.info("User signed up", { userId: user._id, email });

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: "Verification code sent to your email",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error: any) {
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    logger.error("Signup error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password, twoFactorToken } = req.body;

    const user = await authService.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await authService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.emailConfirmed) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in" });
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorToken) {
        return res.status(200).json({
          requiresTwoFactor: true,
          message: "Two-factor authentication code required",
        });
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: String(twoFactorToken),
        window: 1,
      });

      if (!isValid) {
        return res.status(401).json({ message: "Invalid two-factor code" });
      }
    }

    user.lastSignInAt = new Date();
    await user.save();

    const workspaceMembership = await WorkspaceMember.findOne({
      userId: user._id,
      status: "active",
    })
      .populate("workspaceId")
      .sort({ createdAt: 1 });

    const workspace = workspaceMembership?.workspaceId || null;

    let userRole: any = null;
    let userPermissions: string[] = [];

    if (workspace) {
      const membership = await WorkspaceMember.findOne({
        workspaceId: (workspace as any)._id,
        userId: user._id,
        status: "active",
      }).populate("roleId");

      userRole = membership?.roleId as any;
      userPermissions = userRole?.permissions || [];
    }

    const token = authService.generateToken(user._id);

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    logger.info("User logged in", { userId: user._id, email });

    return res.json({
      success: true,
      token,
      user: {
        ...user.toJSON(),
        role: userRole?.name || "user",
        roleId: userRole?._id?.toString() || "",
        permissions: userPermissions,
      },
      workspace,
    });
  } catch (error) {
    logger.error("Login error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function logout(_req: Request, res: Response) {
  try {
    res.cookie("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return res.json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    logger.error("Logout error", { error });
    return res.json({ success: true, message: "Signed out" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    const user = await authService.findByEmail(email);

    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    logger.info("Password reset requested", { userId: user._id, email });

    return res.json({
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
      resetToken:
        process.env.NODE_ENV === NODE_ENVS.DEVELOPMENT ? resetToken : undefined,
    });
  } catch (error) {
    logger.error("Forgot password error", { error });
    return res
      .status(500)
      .json({ message: "Failed to process password reset request" });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, email, password } = req.body;

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await authService.findOne({
      email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    user.password = await authService.hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info("Password reset completed", { userId: user._id });

    return res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error("Reset password error", { error });
    return res.status(500).json({ message: "Failed to reset password" });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    const user = await authService.findByEmail(email);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailConfirmed) {
      return res.status(400).json({ message: "Email already verified" });
    }

    if (
      !user.emailVerificationOtp ||
      user.emailVerificationOtp !== otp ||
      !user.emailVerificationExpires ||
      new Date() > user.emailVerificationExpires
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.emailConfirmed = true;
    user.emailConfirmedAt = new Date();
    user.emailVerificationOtp = undefined;
    user.emailVerificationExpires = undefined;
    user.lastSignInAt = new Date();
    await user.save();

    const membership = await WorkspaceMember.findOne({
      userId: user._id,
      status: "active",
    })
      .populate("workspaceId")
      .populate("roleId");

    const workspace = membership?.workspaceId as any;
    const userRole = membership?.roleId as any;

    const token = authService.generateToken(user._id);

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    logger.info("Email verified", { userId: user._id });

    return res.json({
      success: true,
      token,
      user: {
        ...user.toJSON(),
        role: userRole?.name || "Owner",
        roleId: userRole?._id?.toString() || "",
        permissions: userRole?.permissions || ["*:*"],
      },
      workspace,
    });
  } catch (error) {
    logger.error("Verify email error", { error });
    return res.status(500).json({ message: "Failed to verify email" });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    const user = await User.findById((req as any).user.userId);
    if (!user) return res.status(401).json({ valid: false });

    const lastActiveId = user.preferences?.workspace?.lastActiveProjectId;

    let member;
    if (lastActiveId) {
      member = await WorkspaceMember.findOne({
        userId: user._id,
        workspaceId: lastActiveId,
        status: "active",
      }).populate("workspaceId");
    }

    if (!member) {
      member = await WorkspaceMember.findOne({
        userId: user._id,
        status: "active",
      })
        .populate("workspaceId")
        .sort({ createdAt: 1 });
    }

    const role = await Role.findById(member?.roleId);
    res.json({ valid: true, user: user.toJSON(), workspace: member?.workspaceId, role });
  } catch (error) {
    logger.error("Verify error", { error });
    return res.status(500).json({ valid: false });
  }
}

export async function verify2FA(req: Request, res: Response) {
  try {
    const { token: tfaToken } = req.body;

    const user = await authService.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "Please setup 2FA first" });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: String(tfaToken),
      window: 1,
    });

    if (!isValid) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    return res.json({
      success: true,
      message: "2FA has been enabled successfully",
    });
  } catch (error) {
    logger.error("2FA verify error", { error });
    return res.status(500).json({ message: "Failed to verify 2FA" });
  }
}

export async function setup2FA(req: Request, res: Response) {
  try {
    const user = await authService.findById(req.user!.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.twoFactorEnabled) return res.status(400).json({ message: "2FA is already enabled" });

    const generated = speakeasy.generateSecret({ name: `ClearCRM (${user.email})`, issuer: "ClearCRM" });
    user.twoFactorSecret = generated.base32;
    await user.save();

    const qrCode = await QRCode.toDataURL(generated.otpauth_url || "");
    return res.json({ success: true, secret: generated.base32, qrCode });
  } catch (error) {
    logger.error("2FA setup error", { error });
    return res.status(500).json({ message: "Failed to setup 2FA" });
  }
}

export async function disable2FA(req: Request, res: Response) {
  try {
    const { token } = req.body;
    const user = await authService.findById(req.user!.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) return res.status(400).json({ message: "2FA is not enabled" });

    const isValid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: "base32", token: String(token), window: 1 });
    if (!isValid) return res.status(400).json({ message: "Invalid verification code" });

    user.twoFactorSecret = undefined;
    user.twoFactorEnabled = false;
    await user.save();
    return res.json({ success: true, message: "2FA has been disabled" });
  } catch (error) {
    logger.error("2FA disable error", { error });
    return res.status(500).json({ message: "Failed to disable 2FA" });
  }
}
