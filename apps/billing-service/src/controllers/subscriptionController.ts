import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { BILLING_CHECKOUT_TYPES, FREE_PLAN_ID } from "@crm-platform/shared-types";
import { Plan } from "../models/Plan";
import { Subscription } from "../models/Subscription";
import { cancelRecurring, subscriptionsEnabled, verifySubscriptionFromCashfree } from "../services/recurringService";
import { getWorkspaceRecord, reconcileSubscription, syncWorkspacePlan } from "../services/subscriptionService";

function paymentsOf(subscription: any) {
  const payments = Array.isArray(subscription?.metadata?.payments) ? subscription.metadata.payments : [];
  return [...payments].reverse();
}

export const getSubscription = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const workspace = await getWorkspaceRecord(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const subscription = await reconcileSubscription(workspaceId);
    const planId = (workspace.planId as string) || subscription?.planId || FREE_PLAN_ID;
    const [currentPlan, availablePlans] = await Promise.all([
      Plan.findById(planId),
      Plan.find({ isActive: true }).sort({ sortOrder: 1 }),
    ]);

    res.json({
      success: true,
      subscription,
      currentPlan,
      payments: paymentsOf(subscription),
      checkoutType: subscriptionsEnabled() ? BILLING_CHECKOUT_TYPES.SUBSCRIPTION : BILLING_CHECKOUT_TYPES.ORDER,
      workspace: {
        id: String(workspace._id),
        name: workspace.name,
        planId,
        subscriptionStatus: workspace.subscriptionStatus || subscription?.status || "inactive",
      },
      availablePlans,
    });
  } catch (error: any) {
    logger.error("Failed to fetch subscription", { error: error?.message });
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const workspaceId = String(req.query.workspaceId);
    const subscription = await Subscription.findOne({ workspaceId });
    res.json({ success: true, payments: paymentsOf(subscription) });
  } catch (error: any) {
    logger.error("Failed to fetch payment history", { error: error?.message });
    res.status(500).json({ message: "Failed to fetch payment history" });
  }
};

export const verifySubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId, workspaceId } = req.body;
    const result = await verifySubscriptionFromCashfree(String(subscriptionId), String(workspaceId));
    if (!result.found) return res.status(404).json({ message: "Subscription not found" });
    if (!result.authorized) return res.status(403).json({ message: "Subscription does not belong to this workspace" });
    if (!result.activated) {
      return res.json({
        success: false,
        pending: true,
        status: result.status,
        message: "Authorization is still pending with your bank. Your plan will activate automatically once approved.",
        subscription: result.subscription,
      });
    }
    logger.info("Cashfree subscription verified and activated", { subscriptionId, workspaceId });
    res.json({ success: true, message: "Subscription activated", status: result.status, subscription: result.subscription });
  } catch (error: any) {
    logger.error("Failed to verify subscription", { error: error?.message });
    res.status(500).json({ message: error?.message || "Failed to verify subscription" });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body;
    const subscription = await Subscription.findOne({ workspaceId });
    if (!subscription || subscription.planId === FREE_PLAN_ID || !["active", "past_due"].includes(subscription.status)) {
      return res.status(400).json({ message: "No active subscription to cancel" });
    }

    if (subscription.cashfreeSubscriptionId) {
      try {
        await cancelRecurring(workspaceId);
      } catch (error: any) {
        logger.error("Cashfree cancel failed", { workspaceId, error: error?.message });
        return res.status(502).json({ message: "Could not cancel the mandate with the payment provider. Please try again." });
      }
    }

    subscription.status = "cancelled";
    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    subscription.nextChargeAt = undefined;
    await subscription.save();
    await syncWorkspacePlan(workspaceId, subscription.planId, "cancelled");

    logger.info("Subscription cancelled", { workspaceId, planId: subscription.planId, periodEnd: subscription.currentPeriodEnd });

    res.json({
      success: true,
      message: "Subscription cancelled. Your plan stays active until the end of the current billing period.",
      currentPeriodEnd: subscription.currentPeriodEnd,
      subscription,
    });
  } catch (error: any) {
    logger.error("Failed to cancel subscription", { error: error?.message });
    res.status(500).json({ message: "Failed to cancel subscription" });
  }
};
