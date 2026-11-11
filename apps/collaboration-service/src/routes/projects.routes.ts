import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate, validateQuery } from "../middleware/validate";
import {
  workspaceIdSchema,
  paginationSchema,
  searchSchema,
  PROJECT_VISIBILITY,
} from "@crm-platform/shared-types";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController";
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  inviteToProject,
  getProjectInvitations,
  respondToInvitation,
  requestToJoinProject,
  getJoinRequests,
  respondToJoinRequest,
  reorderProjectTasks,
} from "../controllers/projectMemberController";

const projectsQuerySchema = paginationSchema.merge(searchSchema).extend({
  workspaceId: workspaceIdSchema,
  status: z.enum(["active", "completed", "archived", "on_hold"]).optional(),
});

const createProjectSchema = z.object({
  workspaceId: workspaceIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "completed", "archived", "on_hold"]).default("active"),
  visibility: z.enum(PROJECT_VISIBILITY).default("workspace"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  settings: z.record(z.any()).optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

const updateMemberSchema = z.object({
  roleId: z.string().min(1).optional(),
  status: z.enum(["pending", "active", "inactive"]).optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
  message: z.string().max(1000).optional(),
});

const joinRequestSchema = z.object({
  message: z.string().max(1000).optional(),
});

const projectReorderSchema = z.object({
  tasks: z.array(z.object({
    id: z.string().min(1),
    status: z.enum(["todo", "in_progress", "in_review", "done"]).optional(),
    order: z.number().min(0),
    columnId: z.string().optional(),
  })).min(1),
});

const router = Router();

router.post("/invitations/:token/:action(accept|decline)", verifyToken, respondToInvitation);
router.post("/join-requests/:id/:action(approve|deny)", verifyToken, requirePermission("projects.edit"), respondToJoinRequest);
router.get("/:id/members", verifyToken, requirePermission("projects.view"), getProjectMembers);
router.post("/:id/members", verifyToken, requirePermission("projects.edit"), validate(addMemberSchema), addProjectMember);
router.put("/:id/members/:memberId", verifyToken, requirePermission("projects.edit"), validate(updateMemberSchema), updateProjectMember);
router.delete("/:id/members/:memberId", verifyToken, requirePermission("projects.edit"), removeProjectMember);
router.post("/:id/invite", verifyToken, requirePermission("projects.edit"), validate(inviteSchema), inviteToProject);
router.get("/:id/invitations", verifyToken, requirePermission("projects.view"), getProjectInvitations);
router.post("/:id/join-request", verifyToken, requirePermission("projects.view"), validate(joinRequestSchema), requestToJoinProject);
router.get("/:id/join-requests", verifyToken, requirePermission("projects.view"), getJoinRequests);
router.put("/:id/tasks/reorder", verifyToken, requirePermission("tasks.edit"), validate(projectReorderSchema), reorderProjectTasks);

router.get("/", verifyToken, requirePermission("projects.view"), validateQuery(projectsQuerySchema), getProjects);
router.get("/:id", verifyToken, requirePermission("projects.view"), getProjectById);
router.post("/", verifyToken, requirePermission("projects.create"), validate(createProjectSchema), createProject);
router.put("/:id", verifyToken, requirePermission("projects.edit"), updateProject);
router.delete("/:id", verifyToken, requirePermission("projects.delete"), deleteProject);

export default router;
