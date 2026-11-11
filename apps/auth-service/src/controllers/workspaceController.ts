import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { Workspace, WorkspaceMember, Role } from "../models";
import { checkPlanLimit } from "../services/billingClient";

export async function getWorkspaceById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const membership = await WorkspaceMember.findOne({
      workspaceId: id,
      userId,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    return res.json({
      success: true,
      workspace: {
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        planId: workspace.planId,
        currency: workspace.currency,
        timezone: workspace.timezone,
        settings: workspace.settings,
        subscriptionStatus: workspace.subscriptionStatus,
        createdAt: workspace.createdAt,
      },
    });
  } catch (error) {
    logger.error("Get workspace error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateWorkspace(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const membership = await WorkspaceMember.findOne({
      workspaceId: id,
      userId,
      status: "active",
    }).populate("roleId");

    if (!membership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const userPermissions = (membership.roleId as any)?.permissions || [];
    if (
      !userPermissions.includes("workspace.edit") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const { name, description, currency, timezone, settings } = req.body;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (currency !== undefined) workspace.currency = currency;
    if (timezone !== undefined) workspace.timezone = timezone;
    if (settings !== undefined) workspace.settings = { ...workspace.settings, ...settings };

    await workspace.save();

    logger.info("Workspace updated", { workspaceId: id, userId });

    return res.json({
      success: true,
      workspace: {
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        planId: workspace.planId,
        currency: workspace.currency,
        timezone: workspace.timezone,
        settings: workspace.settings,
        subscriptionStatus: workspace.subscriptionStatus,
        createdAt: workspace.createdAt,
      },
    });
  } catch (error) {
    logger.error("Update workspace error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getWorkspaces(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const memberships = await WorkspaceMember.find({
      userId,
      status: "active",
    })
      .populate("workspaceId")
      .populate("roleId");

    const validMemberships = memberships.filter(
      (m) =>
        m.workspaceId &&
        typeof m.workspaceId !== "string" &&
        (m.workspaceId as any).name
    );

    const workspaces = validMemberships.map((membership) => ({
      id: (membership.workspaceId as any)._id,
      name: (membership.workspaceId as any).name,
      slug: (membership.workspaceId as any).slug,
      planId: (membership.workspaceId as any).planId,
      currency: (membership.workspaceId as any).currency,
      timezone: (membership.workspaceId as any).timezone,
      settings: (membership.workspaceId as any).settings,
      subscriptionStatus: (membership.workspaceId as any).subscriptionStatus,
      createdAt: (membership.workspaceId as any).createdAt,
      role:
        membership.roleId && typeof membership.roleId === "object"
          ? {
              id: (membership.roleId as any)._id,
              name: (membership.roleId as any).name,
              permissions: (membership.roleId as any).permissions,
            }
          : { id: membership.roleId, name: "Unknown", permissions: [] },
    }));

    return res.json({
      workspaces,
      total: workspaces.length,
    });
  } catch (error) {
    logger.error("Get workspaces error", { error });
    return res.status(500).json({ message: "Failed to fetch workspaces" });
  }
}

export async function createWorkspace(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;
    const { name, description, currency, timezone, settings } = req.body;

    const existingMemberships = await WorkspaceMember.find({
      userId,
      status: "active",
    }).populate("workspaceId");

    const validMemberships = existingMemberships.filter(
      (m) =>
        m.workspaceId &&
        typeof m.workspaceId !== "string" &&
        (m.workspaceId as any).name
    );

    const hasWorkspaceWithName = validMemberships.some((membership) => {
      const workspaceName = (membership.workspaceId as any).name
        .trim()
        .toLowerCase();
      return workspaceName === name.trim().toLowerCase();
    });

    if (hasWorkspaceWithName) {
      return res
        .status(409)
        .json({ message: "You already have a workspace with this name" });
    }

    const trimmedName = name.trim();
    const baseSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await Workspace.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const workspace = new Workspace({
      name: trimmedName,
      slug,
      description,
      currency: currency || "USD",
      timezone: timezone || "UTC",
      settings: settings || {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
        weekStartsOn: 0,
        language: "en",
      },
      planId: "free",
      subscriptionStatus: "active",
      createdBy: userId,
    });
    await workspace.save();

    let ownerRole = await Role.findOne({
      name: "Owner",
      workspaceId: workspace._id,
    });

    if (!ownerRole) {
      ownerRole = new Role({
        workspaceId: workspace._id,
        name: "Owner",
        description: "Full access to workspace",
        permissions: ["*:*"],
        isDefault: true,
      });
      await ownerRole.save();
    }

    const membership = new WorkspaceMember({
      workspaceId: workspace._id,
      userId,
      roleId: ownerRole._id,
      status: "active",
      joinedAt: new Date(),
    });
    await membership.save();

    logger.info("Workspace created", {
      workspaceId: workspace._id,
      name: trimmedName,
      userId,
    });

    return res.status(201).json({
      workspace: {
        id: workspace._id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        currency: workspace.currency,
        timezone: workspace.timezone,
        settings: workspace.settings,
        planId: workspace.planId,
        subscriptionStatus: workspace.subscriptionStatus,
        createdAt: workspace.createdAt,
      },
      role: {
        id: ownerRole._id,
        name: ownerRole.name,
        permissions: ownerRole.permissions,
      },
    });
  } catch (error) {
    logger.error("Create workspace error", { error });
    return res.status(500).json({ message: "Failed to create workspace" });
  }
}

export async function getMembers(req: Request, res: Response) {
  try {
    const { id: workspaceId } = req.params;

    const userMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user!.userId,
      status: "active",
    });

    if (!userMembership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const members = await WorkspaceMember.find({
      workspaceId,
      status: "active",
    })
      .populate("userId", "fullName email")
      .lean();

    const transformedMembers = members.map((member: any) => ({
      id: member._id.toString(),
      userId: member.userId._id.toString(),
      workspaceId: member.workspaceId,
      roleId: member.roleId,
      status: member.status,
      joinedAt: member.joinedAt,
      user: {
        id: member.userId._id.toString(),
        fullName: member.userId.fullName,
        email: member.userId.email,
      },
    }));

    return res.json({
      success: true,
      members: transformedMembers,
    });
  } catch (error) {
    logger.error("Get members error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function inviteMember(req: Request, res: Response) {
  try {
    const crypto = require("crypto");
    const { id: workspaceId } = req.params;
    const { email, roleId } = req.body;

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
      !userPermissions.includes("members.invite") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({
        message: "Insufficient permissions to invite members.",
      });
    }

    const role = await Role.findOne({ _id: roleId, workspaceId });
    if (!role) {
      return res.status(400).json({ message: "Invalid role specified" });
    }

    const seatLimit = await checkPlanLimit(String(workspaceId), "members");
    if (!seatLimit.allowed) {
      return res.status(403).json({ message: seatLimit.message, code: seatLimit.code, limit: seatLimit.limit, current: seatLimit.used });
    }

    const { User, Invitation } = require("../models");

    const existingInvitation = await Invitation.findOne({
      workspaceId,
      email: email.toLowerCase(),
      status: "pending",
    });

    if (existingInvitation) {
      return res
        .status(409)
        .json({ message: "User already has a pending invitation" });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      const existingMember = await WorkspaceMember.findOne({
        workspaceId,
        userId: existingUser._id,
        status: "active",
      });

      if (existingMember) {
        return res
          .status(409)
          .json({ message: "User is already a member of this workspace" });
      }
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = new Invitation({
      workspaceId,
      email: email.toLowerCase(),
      roleId,
      invitedBy: req.user!.userId,
      token: inviteToken,
      expiresAt,
      status: "pending",
    });
    await invitation.save();

    logger.info("Member invited", {
      workspaceId,
      invitedEmail: email,
      roleId,
    });

    return res.status(201).json({
      success: true,
      message: "Invitation created successfully",
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: {
          id: role._id,
          name: role.name,
        },
        invitedAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    logger.error("Invite member error", { error });
    return res
      .status(500)
      .json({ message: "Failed to send workspace invitation" });
  }
}

export async function updateMember(req: Request, res: Response) {
  try {
    const { id: workspaceId, memberId: targetUserId } = req.params;
    const { roleId } = req.body;

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
      !userPermissions.includes("members:edit") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: targetUserId,
      status: "active",
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    member.roleId = roleId;
    await member.save();

    logger.info("Member role updated", {
      workspaceId,
      targetUserId,
      newRoleId: roleId,
    });

    return res.json({ success: true, message: "Member role updated" });
  } catch (error) {
    logger.error("Update member error", { error });
    return res
      .status(500)
      .json({ message: "Failed to update member role" });
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const { id: workspaceId, memberId } = req.params;

    const callerMembership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user!.userId,
      status: "active",
    }).populate("roleId");

    if (!callerMembership) {
      return res.status(403).json({ message: "Access denied" });
    }

    const callerPermissions =
      (callerMembership.roleId as any)?.permissions || [];
    if (
      !callerPermissions.includes("members.remove") &&
      !callerPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((callerMembership.roleId as any)?.name)
    ) {
      return res.status(403).json({
        message: "Insufficient permissions to remove members",
      });
    }

    const targetMembership = await WorkspaceMember.findOne({
      _id: memberId,
      workspaceId,
      status: "active",
    })
      .populate("roleId")
      .populate("userId", "fullName email");

    if (!targetMembership) {
      return res.status(404).json({ message: "Member not found" });
    }

    if ((targetMembership.roleId as any)?.name === "Owner") {
      return res
        .status(403)
        .json({ message: "Cannot remove the workspace owner" });
    }

    if (
      (targetMembership.userId as any)._id.toString() === req.user!.userId
    ) {
      return res.status(400).json({
        message: "Cannot remove yourself. Transfer ownership first.",
      });
    }

    targetMembership.status = "removed";
    await targetMembership.save();

    const removedUserName =
      (targetMembership.userId as any).fullName ||
      (targetMembership.userId as any).email;

    logger.info("Member removed", {
      workspaceId,
      removedUserId: (targetMembership.userId as any)._id,
      removedUserName,
    });

    return res.json({
      success: true,
      message: `${removedUserName} has been removed from the workspace`,
    });
  } catch (error) {
    logger.error("Remove member error", { error });
    return res.status(500).json({ message: "Internal server error" });
  }
}
