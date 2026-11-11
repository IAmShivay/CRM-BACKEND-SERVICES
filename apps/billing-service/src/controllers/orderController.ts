import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import {
  BILLING_CHECKOUT_TYPES,
  CASHFREE_DEFAULT_CUSTOMER_PHONE,
  DEFAULT_PLAN_CURRENCY,
} from "@crm-platform/shared-types";
import { Plan } from "../models/Plan";
import { createCashfreeOrder } from "../services/cashfree";
import { startSubscriptionCheckout, subscriptionsEnabled } from "../services/recurringService";
import { getUserRecord, getWorkspaceRecord } from "../services/subscriptionService";

const appUrl = () => process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const publicApiUrl = () => process.env.PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { planId, workspaceId } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) return res.status(404).json({ message: "Plan not found" });
    if (plan.price === 0) return res.status(400).json({ message: "Cannot create an order for the free plan" });

    const workspace = await getWorkspaceRecord(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });
    if (workspace.planId === planId && workspace.subscriptionStatus === "active") {
      return res.status(400).json({ message: "Already subscribed to this plan" });
    }

    const user = await getUserRecord(req.user!.userId);
    if (!user?.email) return res.status(404).json({ message: "User not found" });

    const customer = {
      id: String(workspaceId),
      email: user.email,
      phone: user.phone || CASHFREE_DEFAULT_CUSTOMER_PHONE,
      name: user.fullName || "Customer",
    };
    const currency = plan.currency || DEFAULT_PLAN_CURRENCY;

    if (subscriptionsEnabled()) {
      const checkout = await startSubscriptionCheckout({
        workspaceId: String(workspaceId),
        plan,
        customer,
        returnUrl: `${appUrl()}/plans`,
      });
      logger.info("Cashfree subscription created", {
        subscriptionId: checkout.subscriptionId,
        workspaceId,
        planId,
        amount: plan.price,
      });
      return res.json({
        success: true,
        checkoutType: BILLING_CHECKOUT_TYPES.SUBSCRIPTION,
        subscriptionId: checkout.subscriptionId,
        subscriptionSessionId: checkout.sessionId,
        subscriptionStatus: checkout.status,
        amount: plan.price,
        currency,
        interval: plan.interval,
        planId: plan._id,
        planName: plan.name,
        workspaceName: workspace.name,
      });
    }

    const orderId = `order_${String(workspaceId).slice(-8)}_${Date.now()}`;
    const order = await createCashfreeOrder({
      orderId,
      amount: plan.price,
      currency,
      customer,
      returnUrl: `${appUrl()}/plans?order_id={order_id}`,
      notifyUrl: `${publicApiUrl()}/api/webhooks/cashfree`,
      note: `${planId}|${workspaceId}`,
    });

    logger.info("Cashfree order created", { orderId: order.orderId, workspaceId, planId, amount: plan.price });

    res.json({
      success: true,
      checkoutType: BILLING_CHECKOUT_TYPES.ORDER,
      orderId: order.orderId,
      paymentSessionId: order.paymentSessionId,
      orderStatus: order.orderStatus,
      amount: plan.price,
      currency,
      interval: plan.interval,
      planId: plan._id,
      planName: plan.name,
      workspaceName: workspace.name,
    });
  } catch (error: any) {
    logger.error("Failed to start checkout", { error: error?.message });
    res.status(500).json({ message: error?.message || "Failed to start checkout" });
  }
};
