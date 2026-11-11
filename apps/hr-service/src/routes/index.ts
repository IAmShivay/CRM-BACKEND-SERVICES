import { Router } from "express";
import { z } from "zod";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import { validate } from "../middleware/validate";
import { workspaceIdSchema, mongoIdSchema, emailSchema } from "@crm-platform/shared-types";
import { getEmployees, getEmployeeById, createEmployee } from "../controllers/employeeController";
import { getAttendance, getAttendanceToday, clockIn, clockOut, updateAttendance, attendanceAction } from "../controllers/attendanceController";
import { getHrStats, getLeaveStats } from "../controllers/hrStatsController";
import { getLeaves, createLeave, approveLeave, rejectLeave, cancelLeave, getLeaveById, updateLeave, deleteLeave } from "../controllers/leaveController";
import { getShifts, getShiftById, createShift, updateShift, deleteShift } from "../controllers/shiftController";
import { getAssets, getAssetById, createAsset, updateAsset, deleteAsset, getAssetStats } from "../controllers/assetController";

const router = Router();

router.get("/employees", verifyToken, requirePermission("hr.view"), getEmployees);
router.get("/employees/:id", verifyToken, requirePermission("hr.view"), getEmployeeById);

const createEmployeeSchema = z.object({
  workspaceId: workspaceIdSchema,
  fullName: z.string().min(1).max(100),
  email: emailSchema,
  roleId: mongoIdSchema,
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  startDate: z.string().optional(),
});
router.post("/employees", verifyToken, requirePermission("hr.create"), validate(createEmployeeSchema), createEmployee);

router.get("/hr/stats", verifyToken, requirePermission("hr.view"), getHrStats);
router.post("/attendance", verifyToken, requirePermission("hr.view"), attendanceAction);
router.get("/attendance", verifyToken, requirePermission("hr.view"), getAttendance);
router.get("/attendance/today", verifyToken, requirePermission("hr.view"), getAttendanceToday);
router.post("/attendance/clock-in", verifyToken, requirePermission("hr.edit"), clockIn);
router.put("/attendance/:id/clock-out", verifyToken, requirePermission("hr.edit"), clockOut);
router.put("/attendance/:id", verifyToken, requirePermission("hr.edit"), updateAttendance);

router.get("/leaves/stats", verifyToken, requirePermission("hr.view"), getLeaveStats);
router.get("/leaves", verifyToken, requirePermission("hr.view"), getLeaves);
router.post("/leaves", verifyToken, requirePermission("hr.edit"), createLeave);
router.post("/leaves/:id/approve", verifyToken, requirePermission("hr.edit"), approveLeave);
router.post("/leaves/:id/reject", verifyToken, requirePermission("hr.edit"), rejectLeave);
router.post("/leaves/:id/cancel", verifyToken, requirePermission("hr.edit"), cancelLeave);

router.get("/leaves/:id", verifyToken, requirePermission("hr.view"), getLeaveById);
router.put("/leaves/:id", verifyToken, requirePermission("hr.edit"), updateLeave);
router.delete("/leaves/:id", verifyToken, requirePermission("hr.delete"), deleteLeave);
router.get("/shifts", verifyToken, requirePermission("hr.view"), getShifts);
router.get("/shifts/:id", verifyToken, requirePermission("hr.view"), getShiftById);
router.post("/shifts", verifyToken, requirePermission("hr.create"), createShift);
router.put("/shifts/:id", verifyToken, requirePermission("hr.edit"), updateShift);
router.delete("/shifts/:id", verifyToken, requirePermission("hr.delete"), deleteShift);

router.get("/assets", verifyToken, requirePermission("hr.view"), getAssets);
router.get("/assets/stats", verifyToken, requirePermission("hr.view"), getAssetStats);
router.get("/assets/:id", verifyToken, requirePermission("hr.view"), getAssetById);
router.post("/assets", verifyToken, requirePermission("hr.create"), createAsset);
router.put("/assets/:id", verifyToken, requirePermission("hr.edit"), updateAsset);
router.delete("/assets/:id", verifyToken, requirePermission("hr.delete"), deleteAsset);

export default router;
