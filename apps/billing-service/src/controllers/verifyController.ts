import { Request, Response } from "express";
import logger from "@crm-platform/logger";
import { Plan } from "../models/Plan";
import { fetchCashfreeOrder, verifyCashfreePayment } from "../services/cashfree";
import { activateSubscription } from "../services/subscriptionService";

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, workspaceId, planId } = req.body;

    const order = await fetchCashfreeOrder(orderId);
    const [notePlanId, noteWorkspaceId] = String(order?.order_note || "").split("|");
    if (noteWorkspaceId && noteWorkspaceId !== String(workspaceId)) {
      return res.status(403).json({ message: "Order does not belong to this workspace" });
    }
    const plan = await Plan.findById(notePlanId || planId);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const payment = await verifyCashfreePayment(orderId);
    if (!payment.success) {
      logger.warn("Cashfree payment verification failed", { orderId, status: payment.status, message: payment.message });
      return res.status(400).json({ message: payment.message || "Payment verification failed", status: payment.status });
    }
    if (typeof payment.amount === "number" && payment.amount + 0.01 < plan.price) {
      return res.status(400).json({ message: "Paid amount does not match the plan price" });
    }

    const subscription = await activateSubscription({
      workspaceId: String(workspaceId),
      planId: String(plan._id),
      orderId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    });

    logger.info("Payment verified and subscription activated", {
      workspaceId,
      planId: plan._id,
      orderId,
      paymentId: payment.paymentId,
    });

    res.json({ success: true, message: "Payment verified successfully", subscription });
  } catch (error: any) {
    logger.error("Failed to verify payment", { error: error?.message });
    res.status(500).json({ message: error?.message || "Failed to verify payment" });
  }
};
