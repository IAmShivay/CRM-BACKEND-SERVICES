import mongoose from "mongoose";
import logger from "@crm-platform/logger";
import {
  FREE_PLAN_ID,
  PLAN_LIMIT_UNLIMITED,
  SUBSCRIPTION_GRACE_PERIOD_DAYS,
  SUBSCRIPTION_PERIOD_DAYS,
} from "@crm-platform/shared-types";
import { Plan } from "../models/Plan";
import { Subscription } from "../models/Subscription";
import { cancelCashfreeSubscription } from "./cashfree";

const DAY_MS = 24 * 60 * 60 * 1000;

function workspaceFilter(workspaceId: string) {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(workspaceId)
    ? { $or: [{ workspaceId }, { workspaceId: new ObjectId(workspaceId) }] }
    : { workspaceId };
}

function workspaceIdFilter(workspaceId: string) {
  const ObjectId = mongoose.Types.ObjectId;
  return ObjectId.isValid(workspaceId) ? { _id: new ObjectId(workspaceId) } : { _id: workspaceId as any };
}

export function periodEndFor(interval: string, from: Date) {
  const days =
    SUBSCRIPTION_PERIOD_DAYS[interval as keyof typeof SUBSCRIPTION_PERIOD_DAYS] || SUBSCRIPTION_PERIOD_DAYS.month;
  return new Date(from.getTime() + days * DAY_MS);
}

export async function syncWorkspacePlan(workspaceId: string, planId: string, subscriptionStatus: string) {
  await mongoose.connection
    .db!.collection("workspaces")
    .updateOne(workspaceIdFilter(workspaceId), { $set: { planId, subscriptionStatus, updatedAt: new Date() } });
}

export async function getWorkspaceRecord(workspaceId: string) {
  return mongoose.connection.db!.collection("workspaces").findOne(workspaceIdFilter(workspaceId));
}

export async function getUserRecord(userId: string) {
  const ObjectId = mongoose.Types.ObjectId;
  const filter = ObjectId.isValid(userId) ? { _id: new ObjectId(userId) } : { _id: userId as any };
  return mongoose.connection
    .db!.collection("users")
    .findOne(filter, { projection: { email: 1, fullName: 1, phone: 1 } });
}

export async function activateSubscription(input: {
  workspaceId: string;
  planId: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  method?: string;
  eventId?: string;
  cashfreeSubscriptionId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  const plan = await Plan.findById(input.planId);
  const now = new Date();
  const start = input.periodStart || now;
  const end = input.periodEnd || periodEndFor(plan?.interval || "month", start);
  const metadata: Record<string, unknown> = {
    "metadata.lastPaymentAt": now.toISOString(),
    "metadata.amountPaid": input.amount,
    "metadata.currency": input.currency,
    "metadata.paymentMethod": input.method,
    "metadata.cashfreeOrderId": input.orderId,
    "metadata.cashfreePaymentId": input.paymentId,
  };
  if (input.eventId) metadata["metadata.lastEventId"] = input.eventId;
  const subscription = await Subscription.findOneAndUpdate(
    { workspaceId: input.workspaceId },
    {
      $set: {
        workspaceId: input.workspaceId,
        planId: input.planId,
        status: "active",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        ...(input.orderId ? { cashfreeOrderId: input.orderId } : {}),
        ...(input.paymentId ? { cashfreePaymentId: input.paymentId } : {}),
        ...(input.cashfreeSubscriptionId ? { cashfreeSubscriptionId: input.cashfreeSubscriptionId } : {}),
        ...metadata,
      },
      ...(input.paymentId
        ? {
            $push: {
              "metadata.payments": {
                orderId: input.orderId,
                paymentId: input.paymentId,
                subscriptionId: input.cashfreeSubscriptionId,
                amount: input.amount,
                currency: input.currency,
                method: input.method,
                planId: input.planId,
                paidAt: now,
              },
            },
          }
        : {}),
    },
    { upsert: true, new: true }
  );
  await syncWorkspacePlan(input.workspaceId, input.planId, "active");
  return subscription;
}

export async function markPaymentFailed(workspaceId: string, details: Record<string, unknown>, eventId?: string) {
  const set: Record<string, unknown> = {
    status: "past_due",
    "metadata.lastFailedAt": new Date().toISOString(),
    "metadata.lastFailure": details,
  };
  if (eventId) set["metadata.lastEventId"] = eventId;
  const subscription = await Subscription.findOneAndUpdate({ workspaceId }, { $set: set }, { new: true });
  if (subscription) await syncWorkspacePlan(workspaceId, subscription.planId, "past_due");
  return subscription;
}

export async function reconcileSubscription(workspaceId: string) {
  const subscription = await Subscription.findOne({ workspaceId });
  if (!subscription) return null;
  if (!["active", "cancelled", "past_due", "trialing"].includes(subscription.status)) return subscription;
  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd?.getTime() || 0;
  const expired = periodEnd < now.getTime();
  const graceOver = periodEnd + SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS < now.getTime();
  const recurring = Boolean(subscription.cashfreeSubscriptionId);
  const pastDueGraceOver =
    subscription.status === "past_due" &&
    Boolean(subscription.gracePeriodEnd) &&
    subscription.gracePeriodEnd!.getTime() < now.getTime();

  let shouldDowngrade = pastDueGraceOver;
  if (expired) {
    if (!recurring) shouldDowngrade = true;
    else if (subscription.cancelAtPeriodEnd || subscription.status === "cancelled") shouldDowngrade = true;
    else if (graceOver) shouldDowngrade = true;
  }
  if (!shouldDowngrade) return subscription;

  if (recurring && subscription.status !== "cancelled") {
    try {
      await cancelCashfreeSubscription(subscription.cashfreeSubscriptionId!);
    } catch (error: any) {
      logger.warn("Could not cancel Cashfree subscription during downgrade", {
        workspaceId,
        subscriptionId: subscription.cashfreeSubscriptionId,
        error: error?.message,
      });
    }
  }
  subscription.metadata = {
    ...(subscription.metadata || {}),
    endedCashfreeSubscriptionId: subscription.cashfreeSubscriptionId,
    endedPlanId: subscription.planId,
    endedAt: now.toISOString(),
  };
  subscription.cashfreeSubscriptionId = undefined;
  subscription.nextChargeAt = undefined;
  subscription.gracePeriodEnd = undefined;
  subscription.status = "inactive";
  subscription.planId = FREE_PLAN_ID;
  await subscription.save();
  await syncWorkspacePlan(workspaceId, FREE_PLAN_ID, "inactive");
  logger.info("Workspace downgraded to free plan", { workspaceId });
  return subscription;
}

export async function getPlanLimits(planId: string) {
  const plan = await Plan.findById(planId || FREE_PLAN_ID);
  const limits: Record<string, number> = plan?.limits || {};
  const read = (key: string) => (typeof limits[key] === "number" ? limits[key] : PLAN_LIMIT_UNLIMITED);
  return { plan, leads: read("leads"), members: read("members"), storage: read("storage"), apiCalls: read("apiCalls") };
}

export async function getWorkspaceUsage(workspaceId: string) {
  await reconcileSubscription(workspaceId);
  const workspace = await getWorkspaceRecord(workspaceId);
  const planId = (workspace?.planId as string) || FREE_PLAN_ID;
  const limits = await getPlanLimits(planId);
  const db = mongoose.connection.db!;
  const [leadsUsed, membersUsed] = await Promise.all([
    db.collection("leads").countDocuments({ workspaceId }),
    db.collection("workspacemembers").countDocuments({ ...workspaceFilter(workspaceId), status: "active" }),
  ]);
  return {
    planId,
    planName: limits.plan?.name || "Free",
    subscriptionStatus: (workspace?.subscriptionStatus as string) || "inactive",
    leads: { used: leadsUsed, limit: limits.leads },
    members: { used: membersUsed, limit: limits.members },
    storage: { used: 0, limit: limits.storage },
    apiCalls: { used: 0, limit: limits.apiCalls },
  };
}
