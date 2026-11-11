import logger from "@crm-platform/logger";
import {
  CASHFREE_AUTH_SUCCESS_STATUSES,
  CASHFREE_SUBSCRIPTION_ENDED_STATUSES,
  CASHFREE_SUBSCRIPTION_HOLD_STATUSES,
  CASHFREE_SUBSCRIPTION_ID_PREFIX,
  CASHFREE_SUBSCRIPTION_STATUSES,
  DEFAULT_PLAN_CURRENCY,
  FREE_PLAN_ID,
  SUBSCRIPTION_GRACE_PERIOD_DAYS,
} from "@crm-platform/shared-types";
import { Plan, IPlan } from "../models/Plan";
import { Subscription } from "../models/Subscription";
import {
  CashfreeSubscriptionEntity,
  cancelCashfreeSubscription,
  cashfreePlanIdFor,
  createCashfreeSubscription,
  ensureCashfreePlan,
  fetchCashfreeSubscription,
} from "./cashfree";
import {
  activateSubscription,
  markPaymentFailed,
  periodEndFor,
  reconcileSubscription,
  syncWorkspacePlan,
} from "./subscriptionService";

const DAY_MS = 24 * 60 * 60 * 1000;

export const subscriptionsEnabled = () => process.env.CASHFREE_SUBSCRIPTIONS_ENABLED !== "false";

const upper = (value: unknown) => String(value || "").toUpperCase();

export async function ensurePlanOnCashfree(plan: IPlan) {
  if (plan.cashfreePlanId) return plan.cashfreePlanId;
  const cashfreePlanId = await ensureCashfreePlan({
    planId: cashfreePlanIdFor(String(plan._id), plan.interval, plan.price),
    name: plan.name,
    amount: plan.price,
    currency: plan.currency || DEFAULT_PLAN_CURRENCY,
    interval: plan.interval,
    note: plan.description,
  });
  await Plan.updateOne({ _id: plan._id }, { $set: { cashfreePlanId } });
  return cashfreePlanId;
}

export async function startSubscriptionCheckout(input: {
  workspaceId: string;
  plan: IPlan;
  customer: { id: string; email: string; phone: string; name: string };
  returnUrl: string;
}) {
  const cashfreePlanId = await ensurePlanOnCashfree(input.plan);
  const subscriptionId = `${CASHFREE_SUBSCRIPTION_ID_PREFIX}_${String(input.workspaceId).slice(-8)}_${Date.now()}`;
  const separator = input.returnUrl.includes("?") ? "&" : "?";
  const entity = await createCashfreeSubscription({
    subscriptionId,
    cashfreePlanId,
    planName: input.plan.name,
    amount: input.plan.price,
    customer: input.customer,
    returnUrl: `${input.returnUrl}${separator}subscription_id=${encodeURIComponent(subscriptionId)}`,
    interval: input.plan.interval,
    tags: { workspace_id: String(input.workspaceId), plan_id: String(input.plan._id) },
  });

  const existing = await Subscription.findOne({ workspaceId: input.workspaceId });
  const previous =
    existing?.cashfreeSubscriptionId && ["active", "past_due"].includes(existing.status)
      ? existing.cashfreeSubscriptionId
      : undefined;
  const now = new Date();
  await Subscription.findOneAndUpdate(
    { workspaceId: input.workspaceId },
    {
      $set: {
        "metadata.pendingCashfreeSubscriptionId": subscriptionId,
        "metadata.pendingPlanId": String(input.plan._id),
        "metadata.pendingCreatedAt": now.toISOString(),
        ...(previous ? { "metadata.previousCashfreeSubscriptionId": previous } : {}),
      },
      $setOnInsert: {
        workspaceId: input.workspaceId,
        planId: FREE_PLAN_ID,
        status: "inactive",
        currentPeriodStart: now,
        currentPeriodEnd: now,
      },
    },
    { upsert: true, new: true }
  );

  return { subscriptionId, sessionId: entity.sessionId!, status: entity.status };
}

export function findBySubscriptionId(subscriptionId: string) {
  return Subscription.findOne({
    $or: [{ cashfreeSubscriptionId: subscriptionId }, { "metadata.pendingCashfreeSubscriptionId": subscriptionId }],
  });
}

function paymentFromAuthorization(entity?: CashfreeSubscriptionEntity) {
  const auth = entity?.authorization as any;
  if (!auth?.payment_id) return undefined;
  return {
    paymentId: String(auth.payment_id),
    amount: typeof auth.authorization_amount === "number" ? auth.authorization_amount : undefined,
    method: auth.payment_group || Object.keys(auth.payment_method || {})[0],
  };
}

export async function activateFromCashfree(
  subscriptionId: string,
  entity?: CashfreeSubscriptionEntity,
  payment?: { paymentId?: string; amount?: number; currency?: string; method?: string },
  eventId?: string
) {
  const doc = await findBySubscriptionId(subscriptionId);
  if (!doc) return null;
  const pending = doc.metadata?.pendingCashfreeSubscriptionId === subscriptionId;
  const planId = (pending && doc.metadata?.pendingPlanId) || doc.planId;
  const previous = doc.metadata?.previousCashfreeSubscriptionId as string | undefined;
  const plan = await Plan.findById(planId);
  const now = new Date();
  const nextCharge = entity?.nextScheduleDate ? new Date(entity.nextScheduleDate) : undefined;
  const periodEnd =
    nextCharge && nextCharge.getTime() > now.getTime() ? nextCharge : periodEndFor(plan?.interval || "month", now);

  await activateSubscription({
    workspaceId: doc.workspaceId,
    planId,
    paymentId: payment?.paymentId,
    amount: payment?.amount,
    currency: payment?.currency || plan?.currency || DEFAULT_PLAN_CURRENCY,
    method: payment?.method,
    cashfreeSubscriptionId: subscriptionId,
    periodStart: now,
    periodEnd,
    eventId,
  });
  await Subscription.updateOne(
    { _id: doc._id },
    {
      $set: {
        cashfreeSubscriptionStatus: entity?.status || CASHFREE_SUBSCRIPTION_STATUSES.ACTIVE,
        authorizationStatus: String((entity?.authorization as any)?.authorization_status || "SUCCESS"),
        nextChargeAt: nextCharge || periodEnd,
        gracePeriodEnd: null,
        ...(entity?.authorization ? { mandate: entity.authorization } : {}),
      },
      $unset: {
        "metadata.pendingCashfreeSubscriptionId": 1,
        "metadata.pendingPlanId": 1,
        "metadata.pendingCreatedAt": 1,
        "metadata.previousCashfreeSubscriptionId": 1,
      },
    }
  );

  if (previous && previous !== subscriptionId) {
    try {
      await cancelCashfreeSubscription(previous);
      logger.info("Previous Cashfree subscription cancelled after plan change", { previous, subscriptionId });
    } catch (error: any) {
      logger.warn("Could not cancel previous Cashfree subscription", { previous, error: error?.message });
    }
  }
  return Subscription.findById(doc._id);
}

export async function handleSubscriptionPaymentFailed(
  subscriptionId: string,
  details: Record<string, unknown>,
  eventId?: string
) {
  const doc = await findBySubscriptionId(subscriptionId);
  if (!doc || doc.cashfreeSubscriptionId !== subscriptionId) return null;
  const gracePeriodEnd = new Date(Date.now() + SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS);
  await markPaymentFailed(doc.workspaceId, details, eventId);
  await Subscription.updateOne({ _id: doc._id }, { $set: { gracePeriodEnd } });
  return Subscription.findById(doc._id);
}

export async function handleSubscriptionStatusChange(
  subscriptionId: string,
  status: string,
  eventId?: string,
  entity?: CashfreeSubscriptionEntity
) {
  const doc = await findBySubscriptionId(subscriptionId);
  if (!doc) return null;
  const normalized = upper(status);

  if (normalized === CASHFREE_SUBSCRIPTION_STATUSES.ACTIVE) {
    return activateFromCashfree(subscriptionId, entity, paymentFromAuthorization(entity), eventId);
  }

  const set: Record<string, unknown> = { cashfreeSubscriptionStatus: normalized };
  if (eventId) set["metadata.lastEventId"] = eventId;

  if ((CASHFREE_SUBSCRIPTION_ENDED_STATUSES as readonly string[]).includes(normalized)) {
    if (doc.cashfreeSubscriptionId === subscriptionId) {
      await Subscription.updateOne(
        { _id: doc._id },
        { $set: { ...set, status: "cancelled", cancelAtPeriodEnd: true, cancelledAt: new Date() } }
      );
      await syncWorkspacePlan(doc.workspaceId, doc.planId, "cancelled");
    } else {
      await Subscription.updateOne(
        { _id: doc._id },
        {
          $set: set,
          $unset: {
            "metadata.pendingCashfreeSubscriptionId": 1,
            "metadata.pendingPlanId": 1,
            "metadata.pendingCreatedAt": 1,
            "metadata.previousCashfreeSubscriptionId": 1,
          },
        }
      );
    }
    return Subscription.findById(doc._id);
  }

  if ((CASHFREE_SUBSCRIPTION_HOLD_STATUSES as readonly string[]).includes(normalized)) {
    if (doc.cashfreeSubscriptionId === subscriptionId) {
      await markPaymentFailed(doc.workspaceId, { reason: normalized, subscriptionId }, eventId);
      await Subscription.updateOne(
        { _id: doc._id },
        { $set: { ...set, gracePeriodEnd: new Date(Date.now() + SUBSCRIPTION_GRACE_PERIOD_DAYS * DAY_MS) } }
      );
    }
    return Subscription.findById(doc._id);
  }

  await Subscription.updateOne({ _id: doc._id }, { $set: set });
  return Subscription.findById(doc._id);
}

export async function verifySubscriptionFromCashfree(subscriptionId: string, workspaceId: string) {
  const doc = await findBySubscriptionId(subscriptionId);
  if (!doc) return { found: false as const };
  if (String(doc.workspaceId) !== String(workspaceId)) return { found: true as const, authorized: false as const };
  const entity = await fetchCashfreeSubscription(subscriptionId);
  const authStatus = upper((entity.authorization as any)?.authorization_status);
  const active =
    upper(entity.status) === CASHFREE_SUBSCRIPTION_STATUSES.ACTIVE ||
    (CASHFREE_AUTH_SUCCESS_STATUSES as readonly string[]).includes(authStatus);
  if (active) {
    const subscription = await activateFromCashfree(subscriptionId, entity, paymentFromAuthorization(entity));
    return { found: true as const, authorized: true as const, activated: true as const, status: entity.status, subscription };
  }
  await Subscription.updateOne({ _id: doc._id }, { $set: { cashfreeSubscriptionStatus: entity.status } });
  return { found: true as const, authorized: true as const, activated: false as const, status: entity.status, subscription: doc };
}

export async function cancelRecurring(workspaceId: string) {
  const doc = await Subscription.findOne({ workspaceId });
  if (!doc?.cashfreeSubscriptionId) return doc;
  const entity = await cancelCashfreeSubscription(doc.cashfreeSubscriptionId);
  await Subscription.updateOne(
    { _id: doc._id },
    { $set: { cashfreeSubscriptionStatus: entity.status || CASHFREE_SUBSCRIPTION_STATUSES.CANCELLED } }
  );
  return Subscription.findById(doc._id);
}

export async function reconcileAllSubscriptions() {
  const now = new Date();
  const due = await Subscription.find({
    status: { $in: ["active", "cancelled", "past_due", "trialing"] },
    $or: [{ currentPeriodEnd: { $lt: now } }, { gracePeriodEnd: { $lt: now } }],
  }).select("workspaceId");
  let downgraded = 0;
  for (const item of due) {
    try {
      const result = await reconcileSubscription(item.workspaceId);
      if (result?.planId === FREE_PLAN_ID && result.status === "inactive") downgraded += 1;
    } catch (error: any) {
      logger.error("Subscription reconciliation failed", { workspaceId: item.workspaceId, error: error?.message });
    }
  }
  if (due.length) logger.info("Subscription reconciliation run", { checked: due.length, downgraded });
  return { checked: due.length, downgraded };
}
