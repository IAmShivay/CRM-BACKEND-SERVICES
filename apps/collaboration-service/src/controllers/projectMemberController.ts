import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { PROJECT_INVITATION_TTL_MS } from "@crm-platform/shared-types";
import { Project } from "../models/Project";
import { ProjectMember } from "../models/ProjectMember";
import { ProjectInvitation, ProjectJoinRequest } from "../models/ProjectInvitation";
import { Task } from "../models/Task";

const ObjectId = mongoose.Types.ObjectId;

function idMatch(id: string) {
  return ObjectId.isValid(id) ? { $in: [id, new ObjectId(id)] } : id;
}

async function lookupUsers(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map<string, any>();
  const rows = await mongoose.connection
    .db!.collection("users")
    .find({ _id: { $in: unique.filter((i) => ObjectId.isValid(i)).map((i) => new ObjectId(i)) } }, { projection: { fullName: 1, email: 1, avatarUrl: 1 } })
    .toArray();
  return new Map(rows.map((u: any) => [u._id.toString(), { id: u._id.toString(), fullName: u.fullName, email: u.email, avatarUrl: u.avatarUrl }]));
}

async function lookupRoles(ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map<string, any>();
  const rows = await mongoose.connection
    .db!.collection("roles")
    .find({ _id: { $in: unique.filter((i) => ObjectId.isValid(i)).map((i) => new ObjectId(i)) } }, { projection: { name: 1, permissions: 1 } })
    .toArray();
  return new Map(rows.map((r: any) => [r._id.toString(), { id: r._id.toString(), name: r.name, permissions: r.permissions || [] }]));
}

async function defaultRoleId(workspaceId: string) {
  const db = mongoose.connection.db!;
  const role =
    (await db.collection("roles").findOne({ workspaceId: idMatch(workspaceId), isDefault: true })) ||
    (await db.collection("roles").findOne({ workspaceId: idMatch(workspaceId) }, { sort: { createdAt: 1 } }));
  return role?._id?.toString();
}

async function serializeMembers(members: any[]) {
  const [users, roles] = await Promise.all([
    lookupUsers(members.map((m) => m.userId)),
    lookupRoles(members.map((m) => m.roleId)),
  ]);
  return members.map((m) => ({
    id: m._id.toString(),
    projectId: m.projectId,
    userId: m.userId,
    roleId: m.roleId,
    status: m.status,
    invitedBy: m.invitedBy,
    invitedAt: m.invitedAt,
    joinedAt: m.joinedAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    user: users.get(m.userId),
    role: roles.get(m.roleId),
  }));
}

async function loadProject(id: string, res: Response) {
  const project = await Project.findById(id);
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return null;
  }
  return project;
}

export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    const project = await loadProject(req.params.id, res);
    if (!project) return;
    const members = await ProjectMember.find({ projectId: project._id.toString(), status: { $ne: "removed" } }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, members: await serializeMembers(members) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project members" });
  }
};

export const addProjectMember = async (req: Request, res: Response) => {
  try {
    const project = await loadProject(req.params.id, res);
    if (!project) return;
    const { userId, roleId } = req.body;
    const member = await ProjectMember.findOneAndUpdate(
      { projectId: project._id.toString(), userId },
      {
        $set: { status: "active", roleId, workspaceId: project.workspaceId, invitedBy: req.user!.userId, invitedAt: new Date(), joinedAt: new Date() },
        $unset: { removedAt: 1, removedBy: 1 },
      },
      { upsert: true, new: true }
    );
    const [serialized] = await serializeMembers([member.toObject()]);
    res.status(201).json({ success: true, member: serialized });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to add project member" });
  }
};

export const updateProjectMember = async (req: Request, res: Response) => {
  try {
    const { roleId, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (roleId) updates.roleId = roleId;
    if (status) updates.status = status;
    const member = await ProjectMember.findOneAndUpdate({ _id: req.params.memberId, projectId: req.params.id }, { $set: updates }, { new: true });
    if (!member) return res.status(404).json({ message: "Project member not found" });
    const [serialized] = await serializeMembers([member.toObject()]);
    res.json({ success: true, member: serialized });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update project member" });
  }
};

export const removeProjectMember = async (req: Request, res: Response) => {
  try {
    const member = await ProjectMember.findOneAndUpdate(
      { _id: req.params.memberId, projectId: req.params.id },
      { $set: { status: "removed", removedAt: new Date(), removedBy: req.user!.userId } },
      { new: true }
    );
    if (!member) return res.status(404).json({ message: "Project member not found" });
    res.json({ success: true, message: "Member removed from project" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove project member" });
  }
};

export const inviteToProject = async (req: Request, res: Response) => {
  try {
    const project = await loadProject(req.params.id, res);
    if (!project) return;
    const { email, roleId, message } = req.body;
    const inviteeEmail = String(email).toLowerCase();
    const invitee = await mongoose.connection.db!.collection("users").findOne({ email: inviteeEmail }, { projection: { _id: 1 } });

    const invitation = await ProjectInvitation.findOneAndUpdate(
      { projectId: project._id.toString(), inviteeEmail, status: "pending" },
      {
        $set: {
          workspaceId: project.workspaceId,
          inviteeId: invitee?._id?.toString(),
          inviterId: req.user!.userId,
          roleId,
          message,
          token: crypto.randomBytes(24).toString("hex"),
          expiresAt: new Date(Date.now() + PROJECT_INVITATION_TTL_MS),
        },
      },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, invitation });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to invite to project" });
  }
};

export const getProjectInvitations = async (req: Request, res: Response) => {
  try {
    const invitations = await ProjectInvitation.find({ projectId: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, invitations });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
};

export const respondToInvitation = async (req: Request, res: Response) => {
  try {
    const { token, action } = req.params;
    const invitation = await ProjectInvitation.findOne({ token, status: "pending" });
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return res.status(400).json({ message: "Invitation has expired" });
    }

    const userId = req.user!.userId;
    const user = await mongoose.connection.db!.collection("users").findOne({ _id: new ObjectId(userId) }, { projection: { email: 1 } });
    if (!user || String(user.email).toLowerCase() !== invitation.inviteeEmail) {
      return res.status(403).json({ message: "This invitation was sent to a different email address" });
    }

    if (action === "accept") {
      await ProjectMember.findOneAndUpdate(
        { projectId: invitation.projectId, userId },
        {
          $set: { status: "active", roleId: invitation.roleId, workspaceId: invitation.workspaceId, invitedBy: invitation.inviterId, invitedAt: invitation.createdAt, joinedAt: new Date() },
          $unset: { removedAt: 1, removedBy: 1 },
        },
        { upsert: true }
      );
      invitation.status = "accepted";
      invitation.inviteeId = userId;
      invitation.acceptedAt = new Date();
    } else {
      invitation.status = "declined";
      invitation.declinedAt = new Date();
    }
    await invitation.save();
    res.json({ success: true, status: invitation.status });
  } catch (error) {
    res.status(500).json({ message: "Failed to respond to invitation" });
  }
};

export const requestToJoinProject = async (req: Request, res: Response) => {
  try {
    const project = await loadProject(req.params.id, res);
    if (!project) return;
    const userId = req.user!.userId;
    const existing = await ProjectMember.findOne({ projectId: project._id.toString(), userId, status: "active" });
    if (existing) return res.status(409).json({ message: "You are already a member of this project" });

    const request = await ProjectJoinRequest.findOneAndUpdate(
      { projectId: project._id.toString(), userId, status: "pending" },
      { $set: { workspaceId: project.workspaceId, requesterId: userId, message: req.body.message } },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, request });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create join request" });
  }
};

export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    const requests = await ProjectJoinRequest.find({ projectId: req.params.id }).sort({ createdAt: -1 }).lean();
    const users = await lookupUsers(requests.map((r: any) => r.userId));
    res.json({
      success: true,
      requests: requests.map((r: any) => ({ ...r, id: r._id.toString(), _id: undefined, __v: undefined, user: users.get(r.userId) })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch join requests" });
  }
};

export const respondToJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id, action } = req.params;
    const request = await ProjectJoinRequest.findOne({ _id: id, status: "pending" });
    if (!request) return res.status(404).json({ message: "Join request not found" });

    if (action === "approve") {
      const roleId = await defaultRoleId(request.workspaceId);
      if (!roleId) return res.status(400).json({ message: "Workspace has no role to assign" });
      await ProjectMember.findOneAndUpdate(
        { projectId: request.projectId, userId: request.userId },
        {
          $set: { status: "active", roleId, workspaceId: request.workspaceId, invitedBy: req.user!.userId, invitedAt: new Date(), joinedAt: new Date() },
          $unset: { removedAt: 1, removedBy: 1 },
        },
        { upsert: true }
      );
      request.status = "approved";
      request.approvedBy = req.user!.userId;
      request.approvedAt = new Date();
    } else {
      request.status = "denied";
      request.deniedBy = req.user!.userId;
      request.deniedAt = new Date();
    }
    await request.save();
    res.json({ success: true, status: request.status });
  } catch (error) {
    res.status(500).json({ message: "Failed to respond to join request" });
  }
};

export const reorderProjectTasks = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const tasks: Array<{ id: string; status?: string; order: number; columnId?: string }> = req.body.tasks;
    const ops = tasks.map((t) => {
      const set: Record<string, unknown> = { order: t.order };
      if (t.status) {
        set.status = t.status;
        set.completed = t.status === "done";
        set.completedAt = t.status === "done" ? new Date() : null;
      }
      if (t.columnId) set.columnId = t.columnId;
      return { updateOne: { filter: { _id: t.id, projectId }, update: { $set: set } } };
    });
    const result = await Task.bulkWrite(ops);
    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to reorder tasks" });
  }
};
