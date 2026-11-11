import { Router } from "express";
import multer from "multer";
import { verifyToken } from "@crm-platform/auth-middleware";
import { AVATAR_MAX_SIZE } from "@crm-platform/shared-types";
import {
  getMe,
  updateProfile,
  changePassword,
  getPreferences,
  updatePreferences,
  getLastActiveWorkspace,
  updateLastActiveWorkspace,
  uploadAvatar,
} from "../controllers/userController";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: AVATAR_MAX_SIZE } });

const router = Router();

router.use(verifyToken);

router.get("/me", getMe);
router.put("/me", updateProfile);
router.post("/change-password", changePassword);
router.post("/avatar", upload.single("file"), uploadAvatar);
router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);
router.patch("/preferences", updatePreferences);
router.get("/last-active-workspace", getLastActiveWorkspace);
router.post("/last-active-workspace", updateLastActiveWorkspace);

export default router;
