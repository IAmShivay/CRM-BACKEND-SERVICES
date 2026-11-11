import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import {
  CASHFREE_AUTH_SUCCESS_STATUSES,
  CASHFREE_PAYMENT_SUCCESS_STATUS,
  CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS,
  CASHFREE_WEBHOOK_EVENTS,
  CASHFREE_WEBHOOK_SIGNATURE_HEADER,
  CASHFREE_WEBHOOK_TIMESTAMP_HEADER,
} from "@crm-platform/shared-types";
import { Subscription } from "../models/Subscription";
import { verifyCashfreeWebhookSignature } from "../services/cashfree";
import {
  activateFromCashfree,
  findBySubscriptionId,
  handleSubscriptionPaymentFailed,
  handleSubscriptionStatusChange,
} from "../services/recurringService";
import { activateSubscription, markPaymentFailed, syncWorkspacePlan } from "../services/subscriptionService";

const is = (type: string, group: readonly string[]) => group.includes(type);

function orderContext(data: any) {
  const [planId, workspaceId] = String(data?.order?.order_note || "").split("|");
  return { planId, workspaceId, orderId: data?.order?.order_id as string | undefined, payment: data?.payment };
}

function subscriptionContext(data: any) {
  const details = data?.subscription_details || data?.subscription || {};
  const paymentDetails = data?.payment_details || data?.payment || {};
  const authorization = data?.authorization_details || details?.authorization_details || {};
  const amount = Number(data?.payment_amount ?? paymentDetails?.payment_amount ?? authorization?.authorization_amount);
  return {
    subscriptionId: String(data?.subscription_id || details?.subscription_id || ""),
    status: String(details?.subscription_status || data?.subscription_status || ""),
    paymentId: data?.cf_payment_id || paymentDetails?.cf_payment_id || data?.payment_id,
    amount: Number.isFinite(amount) ? amount : undefined,
    currency: data?.payment_currency || paymentDetails?.payment_currency,
    paymentStatus: String(data?.payment_status || paymentDetails?.payment_status || ""),
    authorizationStatus: String(authorization?.authorization_status || authorization?.authorizationStatus || ""),
    method:
      typeof authorization?.payment_method === "string"
        ? authorization.payment_method
        : data?.payment_group || paymentDetails?.payment_group,
    failureReason: data?.failureDetails?.failureReason || data?.failure_details?.failure_reason,
    scheduledOn: data?.payment_schedule_date,
  };
}

async function cancelByFilter(filter: Record<string, unknown>, set: Record<string, unknown>) {
  const subscription = await Subscription.findOneAndUpdate(
    filter,
    { $set: { status: "cancelled", cancelledAt: new Date(), cancelAtPeriodEnd: true, ...set } },
    { new: true }
  );
  if (subscription) await syncWorkspacePlan(subscription.workspaceId, subscription.planId, "cancelled");
}

export const handleCashfreeWebhook = async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody as string | undefined;
    const signature = req.header(CASHFREE_WEBHOOK_SIGNATURE_HEADER);
    const timestamp = req.header(CASHFREE_WEBHOOK_TIMESTAMP_HEADER);

    if (!rawBody || !signature || !timestamp) {
      return res.status(400).json({ message: "Missing webhook signature" });
    }
    if (!verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) {
      logger.warn("Cashfree webhook signature rejected");
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(rawBody);
    const type = String(event.type || "");
    const data = event.data || {};
    const sub = subscriptionContext(data);
    const eventId = `${type}_${data?.order?.order_id || sub.subscriptionId}_${sub.paymentId || sub.status}_${timestamp}`;

    const duplicate = await Subscription.exists({ "metadata.lastEventId": eventId });
    if (duplicate) return res.json({ received: true, duplicate: true });

    logger.info("Cashfree webhook received", { type, eventId });

    const subscriptionPayment = {
      paymentId: sub.paymentId ? String(sub.paymentId) : undefined,
      amount: sub.amount,
      currency: sub.currency,
      method: typeof sub.method === "string" ? sub.method : undefined,
    };

    if (is(type, CASHFREE_WEBHOOK_EVENTS.PAYMENT_SUCCESS)) {
      const ctx = orderContext(data);
      if (ctx.workspaceId && ctx.planId) {
        await activateSubscription({
          workspaceId: ctx.workspaceId,
          planId: ctx.planId,
          orderId: ctx.orderId,
          paymentId: ctx.payment?.cf_payment_id ? String(ctx.payment.cf_payment_id) : undefined,
          amount: ctx.payment?.payment_amount,
          currency: ctx.payment?.payment_currency,
          method: ctx.payment?.payment_group,
          eventId,
        });
      }
    } else if (is(type, CASHFREE_WEBHOOK_EVENTS.PAYMENT_FAILED) || is(type, CASHFREE_WEBHOOK_EVENTS.PAYMENT_DROPPED)) {
      const ctx = orderContext(data);
      if (ctx.workspaceId) {
        await markPaymentFailed(
          ctx.workspaceId,
          { orderId: ctx.orderId, paymentId: ctx.payment?.cf_payment_id, reason: ctx.payment?.payment_message || type },
          eventId
        );
      }
    } else if (is(type, CASHFREE_WEBHOOK_EVENTS.REFUND)) {
      const refund = data?.refund;
      if (refund?.order_id && refund?.refund_status === "SUCCESS") {
        await cancelByFilter({ cashfreeOrderId: refund.order_id }, { "metadata.lastEventId": eventId, "metadata.refund": refund });
      }
    } else if (is(type, CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS.STATUS_CHANGE)) {
      if (sub.subscriptionId) await handleSubscriptionStatusChange(sub.subscriptionId, sub.status, eventId);
    } else if (is(type, CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS.AUTH_STATUS)) {
      const authorized =
        (CASHFREE_AUTH_SUCCESS_STATUSES as readonly string[]).includes(sub.authorizationStatus.toUpperCase()) ||
        sub.paymentStatus.toUpperCase() === CASHFREE_PAYMENT_SUCCESS_STATUS;
      if (sub.subscriptionId && authorized) {
        await activateFromCashfree(sub.subscriptionId, undefined, subscriptionPayment, eventId);
      } else if (sub.subscriptionId) {
        const doc = await findBySubscriptionId(sub.subscriptionId);
        if (doc) {
          await Subscription.updateOne(
            { _id: doc._id },
            { $set: { authorizationStatus: sub.authorizationStatus || sub.paymentStatus, "metadata.lastEventId": eventId } }
          );
        }
      }
    } else if (is(type, CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS.PAYMENT_SUCCESS)) {
      if (sub.subscriptionId) await activateFromCashfree(sub.subscriptionId, undefined, subscriptionPayment, eventId);
    } else if (is(type, CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS.PAYMENT_FAILED)) {
      if (sub.subscriptionId) {
        await handleSubscriptionPaymentFailed(
          sub.subscriptionId,
          { paymentId: sub.paymentId, reason: sub.failureReason || type, scheduledOn: sub.scheduledOn },
          eventId
        );
      }
    } else if (is(type, CASHFREE_SUBSCRIPTION_WEBHOOK_EVENTS.REFUND)) {
      const doc = sub.subscriptionId
        ? await findBySubscriptionId(sub.subscriptionId)
        : data?.payment_id
          ? await Subscription.findOne({ "metadata.payments.paymentId": String(data.payment_id) })
          : null;
      if (doc) {
        await Subscription.updateOne({ _id: doc._id }, { $set: { "metadata.lastEventId": eventId, "metadata.refund": data } });
      }
    } else {
      logger.info("Unhandled Cashfree webhook event", { type });
    }

    res.json({ received: true });
  } catch (error: any) {
    logger.error("Cashfree webhook error", { error: error?.message });
    res.status(500).json({ message: "Webhook processing failed" });
  }
};
