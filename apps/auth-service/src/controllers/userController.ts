import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import logger from "@crm-platform/logger";
import { User, WorkspaceMember } from "../models";
import { uploadFile, validateFile, ALLOWED_FILE_TYPES } from "@crm-platform/storage";
import { AVATAR_MAX_SIZE } from "@crm-platform/shared-types";

export async function getMe(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const membership = await WorkspaceMember.findOne({
      userId: user._id,
      status: "active",
    })
      .populate("workspaceId")
      .populate("roleId")
      .sort({ createdAt: 1 });

    const workspace = membership?.workspaceId as any;
    const userRole = membership?.roleId as any;

    return res.json({
      success: true,
      user: {
        ...user.toJSON(),
        role: userRole?.name || "user",
        roleId: userRole?._id?.toString() || "",
        permissions: userRole?.permissions || [],
      },
      workspace: workspace
        ? {
            id: workspace._id?.toString(),
            name: workspace.name,
            planId: workspace.planId || "free",
            currency: workspace.currency || "USD",
            timezone: workspace.timezone || "UTC",
            settings: workspace.settings,
            createdAt: workspace.createdAt,
          }
        : null,
    });
  } catch (error) {
    logger.error("Get me error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const { fullName, timezone, avatarUrl, preferences } = req.body;

    const user = await User.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (timezone !== undefined) user.timezone = timezone;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (preferences !== undefined)
      user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    logger.info("Profile updated", { userId: user._id });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error("Update profile error", { error });
    return res.status(500).json({ message: "Failed to update profile" });
  }
}

export async function getPreferences(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user!.userId).select("preferences");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ success: true, preferences: user.preferences || {} });
  } catch (error) {
    logger.error("Get preferences error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updatePreferences(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.preferences = { ...user.preferences, ...req.body };
    await user.save();
    logger.info("Preferences updated", { userId: user._id });
    return res.json({ success: true, preferences: user.preferences });
  } catch (error) {
    logger.error("Update preferences error", { error });
    return res.status(500).json({ message: "Failed to update preferences" });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    const user = await User.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    logger.info("Password changed", { userId: user._id });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    logger.error("Change password error", { error });
    return res.status(500).json({ message: "Failed to change password" });
  }
}

export async function getLastActiveWorkspace(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user!.userId).select("preferences");
    const lastActiveWorkspaceId = user?.preferences?.workspace?.lastActiveProjectId || null;

    if (lastActiveWorkspaceId) {
      const membership = await WorkspaceMember.findOne({
        userId: req.user!.userId,
        status: "active",
      }).populate("workspaceId");

      const workspace = membership?.workspaceId as any;
      if (workspace) {
        return res.json({
          lastActiveWorkspaceId,
          workspace: {
            id: workspace._id?.toString(),
            name: workspace.name,
            planId: workspace.planId || "free",
            createdAt: workspace.createdAt,
          },
        });
      }
    }

    return res.json({ lastActiveWorkspaceId: null });
  } catch (error) {
    logger.error("Get last active workspace error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateLastActiveWorkspace(req: Request, res: Response) {
  try {
    const { workspaceId } = req.body;
    const user = await User.findById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.preferences) user.preferences = {};
    if (!user.preferences.workspace) user.preferences.workspace = {};
    user.preferences.workspace.lastActiveProjectId = workspaceId;
    user.markModified("preferences");
    await user.save();

    return res.json({ message: "Last active workspace updated" });
  } catch (error) {
    logger.error("Update last active workspace error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function uploadAvatar(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file provided" });

    const validation = validateFile({ mimetype: file.mimetype, size: file.size, name: file.originalname }, ALLOWED_FILE_TYPES.images, AVATAR_MAX_SIZE);
    if (!validation.isValid) return res.status(400).json({ message: validation.errors[0] });

    const result = await uploadFile(file.buffer, {
      fileName: file.originalname,
      contentType: file.mimetype,
      folder: `users/${req.user!.userId}/avatar`,
      metadata: { userId: req.user!.userId },
    });

    const user = await User.findByIdAndUpdate(req.user!.userId, { avatarUrl: result.url }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ success: true, avatarUrl: result.url });
  } catch (error) {
    logger.error("Avatar upload error", { error });
    return res.status(500).json({ message: "Upload failed" });
  }
}
