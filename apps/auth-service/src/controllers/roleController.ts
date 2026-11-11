import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { Role, WorkspaceMember } from "../models";

export async function getRoles(req: Request, res: Response) {
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
      !userPermissions.includes("roles.view") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({
        message: "Insufficient permissions to view roles.",
      });
    }

    const roles = await Role.find({ workspaceId }).sort({ createdAt: 1 });

    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const memberCount = await WorkspaceMember.countDocuments({
          workspaceId,
          roleId: role._id,
          status: "active",
        });

        return {
          id: role._id,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isDefault: role.isDefault,
          memberCount,
          createdAt: role.createdAt,
          updatedAt: role.updatedAt,
        };
      })
    );

    return res.json({
      success: true,
      roles: rolesWithCounts,
    });
  } catch (error) {
    logger.error("Get roles error", { error });
    return res
      .status(500)
      .json({ message: "Failed to retrieve workspace roles" });
  }
}

export async function createRole(req: Request, res: Response) {
  try {
    const workspaceId = req.params.id || req.body.workspaceId;
    const { name, description, permissions } = req.body;

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
      !userPermissions.includes("roles.create") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({
        message: "Insufficient permissions to create roles.",
      });
    }

    const existingRole = await Role.findOne({ workspaceId, name });
    if (existingRole) {
      return res.status(409).json({
        message: "A role with this name already exists in the workspace",
      });
    }

    const newRole = new Role({
      workspaceId,
      name,
      description,
      permissions,
      isDefault: false,
    });
    await newRole.save();

    logger.info("Role created", {
      workspaceId,
      roleId: newRole._id,
      roleName: name,
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      role: {
        id: newRole._id,
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions,
        isDefault: newRole.isDefault,
        memberCount: 0,
        createdAt: newRole.createdAt,
        updatedAt: newRole.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Create role error", { error });
    return res
      .status(500)
      .json({ message: "Failed to create workspace role" });
  }
}

export async function updateRole(req: Request, res: Response) {
  try {
    const { roleId } = req.params;
    const workspaceId = req.params.id || req.body.workspaceId || req.query.workspaceId;
    const { name, description, permissions } = req.body;

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
      !userPermissions.includes("roles.edit") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const role = await Role.findOne({ _id: roleId, workspaceId });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.name === "Owner") {
      return res
        .status(400)
        .json({ message: "Cannot modify the Owner role" });
    }

    if (permissions) {
      role.permissions = permissions;
    }

    if (name !== undefined) {
      const existing = await Role.findOne({
        workspaceId,
        name,
        _id: { $ne: roleId },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "A role with this name already exists" });
      }
      role.name = name;
    }

    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    logger.info("Role updated", { workspaceId, roleId });

    return res.json({
      success: true,
      role: {
        id: role._id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isDefault: role.isDefault,
      },
    });
  } catch (error) {
    logger.error("Update role error", { error });
    return res.status(500).json({ message: "Failed to update role" });
  }
}

export async function deleteRole(req: Request, res: Response) {
  try {
    const { roleId } = req.params;
    const workspaceId = req.params.id || req.body.workspaceId || req.query.workspaceId;

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
      !userPermissions.includes("roles.delete") &&
      !userPermissions.includes("*:*") &&
      !["Owner", "Admin"].includes((membership.roleId as any)?.name)
    ) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const role = await Role.findOne({ _id: roleId, workspaceId });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.name === "Owner" || role.isDefault) {
      return res
        .status(400)
        .json({ message: "Cannot delete default or Owner roles" });
    }

    const membersWithRole = await WorkspaceMember.countDocuments({
      workspaceId,
      roleId,
      status: "active",
    });

    if (membersWithRole > 0) {
      return res.status(400).json({
        message: `Cannot delete role — ${membersWithRole} member(s) are assigned to it. Reassign them first.`,
      });
    }

    await Role.findByIdAndDelete(roleId);

    logger.info("Role deleted", { workspaceId, roleId });

    return res.json({
      success: true,
      message: "Role deleted",
    });
  } catch (error) {
    logger.error("Delete role error", { error });
    return res.status(500).json({ message: "Failed to delete role" });
  }
}

export async function getRoleById(req: Request, res: Response) {
  try {
    const role = await Role.findById(req.params.roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });
    return res.json({ success: true, role });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}
