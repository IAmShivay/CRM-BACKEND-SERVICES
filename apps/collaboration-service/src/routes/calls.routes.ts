import { Router } from "express";
import { verifyToken, requirePermission } from "@crm-platform/auth-middleware";
import {
  getCallSettings,
  updateCallSettings,
  initiateCall,
  getCallLogs,
} from "../controllers/callsController";

const router = Router();

router.get("/settings", verifyToken, requirePermission("settings.view"), getCallSettings);
router.post("/settings", verifyToken, requirePermission("settings.manage"), updateCallSettings);
router.post("/initiate", verifyToken, requirePermission("leads.view"), initiateCall);
router.get("/logs", verifyToken, requirePermission("leads.view"), getCallLogs);

export default router;
