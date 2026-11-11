import webpush from "web-push";
import logger from "@crm-platform/logger";
import { PushSubscription } from "../models/PushSubscription";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publicKey, privateKey);
  configured = true;
  return true;
}

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return 0;
  const subscriptions = await PushSubscription.find({ userId }).lean();
  let delivered = 0;
  await Promise.all(
    subscriptions.map(async (sub: any) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
        delivered++;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          logger.warn("Push delivery failed", { userId, error: err?.message });
        }
      }
    })
  );
  return delivered;
}
