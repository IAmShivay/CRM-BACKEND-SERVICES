import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "@crm-platform/auth-middleware";
import { validate } from "../middleware/validate";
import { workspaceIdSchema } from "@crm-platform/shared-types";
import { getVapidPublicKey, subscribe, unsubscribe } from "../controllers/pushController";

const subscribeSchema = z.object({
  workspaceId: workspaceIdSchema,
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    expirationTime: z.number().nullable().optional(),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

const router = Router();

router.get("/vapid-public-key", getVapidPublicKey);
router.post("/subscribe", verifyToken, validate(subscribeSchema), subscribe);
router.delete("/subscribe", verifyToken, validate(unsubscribeSchema), unsubscribe);

export default router;
