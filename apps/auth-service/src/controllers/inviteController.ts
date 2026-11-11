import crypto from "crypto";
import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { AuthService } from "../services/AuthService";
import {
  Invitation,
  WorkspaceMember,
  Role,
  Workspace,
  User,
} from "../models";

export async function getInvites(req: Request, res: Response) {
  try {
    const workspaceId = req.params.id || req.query.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID required" });
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user!.userId,
      status: "active",
    }).populate("roleId");

    if (!membership) {
      return res.status(403).json({
        message: "Access denied. You are not a member of this workspace.",
      });
    }

    const userPermissions = (membership.roleId as any)?.permissions || [];
    if (
      !userPermissions.includes("members.view") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({
        message: "Insufficient permissions to view invitations.",
      });
    }

    const pendingInvites = await Invitation.find({
      workspaceId,
      status: "pending",
    })
      .populate("roleId", "name permissions")
      .populate("invitedBy", "fullName email")
      .sort({ createdAt: -1 });

    const invitations = pendingInvites.map((invite: any) => ({
      id: invite._id,
      email: invite.email,
      role: {
        id: invite.roleId._id,
        name: invite.roleId.name,
        permissions: invite.roleId.permissions,
      },
      invitedBy: {
        id: invite.invitedBy._id,
        name: invite.invitedBy.fullName || invite.invitedBy.email,
        email: invite.invitedBy.email,
      },
      invitedAt: invite.createdAt,
      expiresAt: invite.expiresAt,
      status: invite.status,
    }));

    return res.json({
      success: true,
      invitations,
    });
  } catch (error) {
    logger.error("Get invites error", { error });
    return res
      .status(500)
      .json({ message: "Failed to retrieve workspace invitations" });
  }
}

export async function resendInvite(req: Request, res: Response) {
  try {
    const inviteId = req.params.inviteId;
    const workspaceId = req.params.id || String(req.query.workspaceId || req.body?.workspaceId || "");

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user!.userId,
      status: "active",
    }).populate("roleId");

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const userPermissions = (membership.roleId as any)?.permissions || [];
    if (
      !userPermissions.includes("members.invite") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res
        .status(403)
        .json({ message: "Insufficient permissions" });
    }

    const invitation = await Invitation.findOne({
      _id: inviteId,
      workspaceId,
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    if (invitation.status === "accepted") {
      return res
        .status(400)
        .json({ message: "Invitation already accepted" });
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    invitation.token = newToken;
    invitation.expiresAt = newExpiry;
    invitation.status = "pending";
    await invitation.save();

    logger.info("Invitation resent", {
      workspaceId,
      inviteId,
      email: invitation.email,
    });

    return res.json({
      success: true,
      message: "Invitation resent with a new link",
      invitation: {
        id: invitation._id,
        email: invitation.email,
        expiresAt: newExpiry,
      },
    });
  } catch (error) {
    logger.error("Resend invite error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function cancelInvite(req: Request, res: Response) {
  try {
    const inviteId = req.params.inviteId;
    const workspaceId = req.params.id || String(req.query.workspaceId || req.body?.workspaceId || "");

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user!.userId,
      status: "active",
    }).populate("roleId");

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const userPermissions = (membership.roleId as any)?.permissions || [];
    if (
      !userPermissions.includes("members.invite") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res
        .status(403)
        .json({ message: "Insufficient permissions" });
    }

    const invitation = await Invitation.findOne({
      _id: inviteId,
      workspaceId,
      status: "pending",
    });

    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invitation not found or already processed" });
    }

    invitation.status = "cancelled";
    await invitation.save();

    logger.info("Invitation cancelled", {
      workspaceId,
      inviteId,
      email: invitation.email,
    });

    return res.json({
      success: true,
      message: "Invitation cancelled",
    });
  } catch (error) {
    logger.error("Cancel invite error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function acceptInvite(req: Request, res: Response) {
  try {
    const { token } = req.body;

    const invitation = await Invitation.findOne({
      token,
      status: "pending",
    });

    if (!invitation) {
      return res
        .status(404)
        .json({ message: "Invalid or expired invitation" });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({ message: "Invitation has expired" });
    }

    const user = await User.findOne({
      email: invitation.email.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email. Please sign up first.",
      });
    }

    const existingMember = await WorkspaceMember.findOne({
      workspaceId: invitation.workspaceId,
      userId: user._id,
      status: "active",
    });

    if (existingMember) {
      invitation.status = "accepted";
      invitation.acceptedAt = new Date();
      await invitation.save();

      return res.status(409).json({
        message: "You are already a member of this workspace",
      });
    }

    const member = new WorkspaceMember({
      workspaceId: invitation.workspaceId,
      userId: user._id,
      roleId: invitation.roleId,
      status: "active",
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
    });
    await member.save();

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    const workspace = await Workspace.findById(invitation.workspaceId);
    const role = await Role.findById(invitation.roleId);

    logger.info("Invitation accepted", {
      workspaceId: invitation.workspaceId,
      userId: user._id,
      email: invitation.email,
    });

    return res.json({
      success: true,
      message: "Invitation accepted successfully",
      workspace: workspace
        ? {
            id: workspace._id,
            name: workspace.name,
            slug: workspace.slug,
          }
        : null,
      role: role
        ? {
            id: role._id,
            name: role.name,
            permissions: role.permissions,
          }
        : null,
    });
  } catch (error) {
    logger.error("Accept invite error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

const authService = new AuthService();

async function findPendingInvitation(token: string) {
  const invitation = await Invitation.findOne({ token, status: "pending" });
  if (!invitation) return null;
  if (invitation.expiresAt < new Date()) {
    invitation.status = "expired";
    await invitation.save();
    return null;
  }
  return invitation;
}

export async function validateInvite(req: Request, res: Response) {
  try {
    const invitation = await findPendingInvitation(req.body.token);
    if (!invitation) return res.status(404).json({ message: "Invalid or expired invitation" });

    const [workspace, role] = await Promise.all([
      Workspace.findById(invitation.workspaceId).select("name"),
      Role.findById(invitation.roleId).select("name"),
    ]);

    return res.json({
      success: true,
      invitation: {
        email: invitation.email,
        workspace: { id: invitation.workspaceId, name: workspace?.name || "" },
        role: { id: invitation.roleId, name: role?.name || "" },
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    logger.error("Validate invite error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function declineInvite(req: Request, res: Response) {
  try {
    const invitation = await findPendingInvitation(req.body.token);
    if (!invitation) return res.status(404).json({ message: "Invalid or expired invitation" });
    invitation.status = "declined";
    await invitation.save();
    return res.json({ success: true, message: "Invitation declined" });
  } catch (error) {
    logger.error("Decline invite error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function acceptWithRegistration(req: Request, res: Response) {
  try {
    const { token, fullName, password } = req.body;
    const invitation = await findPendingInvitation(token);
    if (!invitation) return res.status(404).json({ message: "Invalid or expired invitation" });

    const existing = await User.findOne({ email: invitation.email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists. Log in to accept the invitation.", requireLogin: true });
    }

    const user = new User({
      email: invitation.email.toLowerCase(),
      password: await authService.hashPassword(password),
      fullName,
      emailConfirmed: true,
      emailConfirmedAt: new Date(),
      lastActiveWorkspaceId: invitation.workspaceId,
    });
    await user.save();

    await new WorkspaceMember({
      workspaceId: invitation.workspaceId,
      userId: user._id,
      roleId: invitation.roleId,
      status: "active",
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
    }).save();

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    logger.info("Invitation accepted with registration", { userId: user._id, workspaceId: invitation.workspaceId });
    return res.status(201).json({ success: true, message: "Account created. You can now log in.", workspace: { id: invitation.workspaceId } });
  } catch (error) {
    logger.error("Accept with registration error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}
