import crypto from "crypto";
import {
  CASHFREE_API_VERSION,
  CASHFREE_BASE_URLS,
  CASHFREE_ENVIRONMENTS,
  CASHFREE_PAYMENT_SUCCESS_STATUS,
  CASHFREE_PLAN_ID_PREFIX,
  CASHFREE_PLAN_INTERVAL_TYPES,
  CASHFREE_PLAN_TYPES,
  CASHFREE_SUBSCRIPTION_ACTIONS,
  CASHFREE_SUBSCRIPTION_API_VERSION,
  CASHFREE_SUBSCRIPTION_EXPIRY_YEARS,
  CASHFREE_SUBSCRIPTION_NOTIFICATION_CHANNELS,
  CASHFREE_SUBSCRIPTION_PATHS,
  CASHFREE_SUBSCRIPTION_PAYMENT_METHODS,
  CASHFREE_WEBHOOK_MAX_AGE_MS,
  CASHFREE_IST_OFFSET,
  CASHFREE_IST_OFFSET_MS,
} from "@crm-platform/shared-types";

type CashfreeEnvironment = (typeof CASHFREE_ENVIRONMENTS)[number];

export interface CashfreeOrderInput {
  orderId: string;
  amount: number;
  currency: string;
  customer: { id: string; email: string; phone: string; name: string };
  returnUrl: string;
  notifyUrl: string;
  note?: string;
}

export interface CashfreePaymentResult {
  success: boolean;
  paymentId?: string;
  amount?: number;
  currency?: string;
  method?: string;
  status?: string;
  message?: string;
}

function credentials() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) throw new Error("CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be set");
  return { appId, secretKey };
}

export function cashfreeEnvironment(): CashfreeEnvironment {
  const configured = process.env.CASHFREE_ENV;
  if (configured && (CASHFREE_ENVIRONMENTS as readonly string[]).includes(configured)) {
    return configured as CashfreeEnvironment;
  }
  return process.env.NODE_ENV === "production" ? "production" : "sandbox";
}

function baseUrl() {
  return CASHFREE_BASE_URLS[cashfreeEnvironment()];
}

export class CashfreeRequestError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init: { method: string; body?: unknown; version?: string }
): Promise<T> {
  const { appId, secretKey } = credentials();
  const response = await fetch(`${baseUrl()}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": init.version || CASHFREE_API_VERSION,
      "x-client-id": appId,
      "x-client-secret": secretKey,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) {
    throw new CashfreeRequestError(
      data?.message || `Cashfree request failed with ${response.status}`,
      response.status,
      data?.code
    );
  }
  return data as T;
}

const subscriptionRequest = <T>(path: string, init: { method: string; body?: unknown }) =>
  request<T>(path, { ...init, version: CASHFREE_SUBSCRIPTION_API_VERSION });

export interface CashfreePlanInput {
  planId: string;
  name: string;
  amount: number;
  currency: string;
  interval: string;
  note?: string;
}

export interface CashfreeSubscriptionInput {
  subscriptionId: string;
  cashfreePlanId: string;
  planName: string;
  amount: number;
  customer: { id: string; email: string; phone: string; name: string };
  returnUrl: string;
  interval: string;
  tags?: Record<string, string>;
}

export interface CashfreeSubscriptionEntity {
  subscriptionId: string;
  cfSubscriptionId?: string;
  sessionId?: string;
  status: string;
  nextScheduleDate?: string;
  firstChargeTime?: string;
  expiryTime?: string;
  authorization?: Record<string, unknown>;
  planId?: string;
  raw: any;
}

export function toIstIso(date: Date) {
  const ist = new Date(date.getTime() + CASHFREE_IST_OFFSET_MS);
  return `${ist.toISOString().slice(0, 19)}${CASHFREE_IST_OFFSET}`;
}

export function addPlanInterval(date: Date, interval: string) {
  const next = new Date(date);
  if (interval === "year") next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

export function cashfreePlanIdFor(planId: string, interval: string, amount: number) {
  return `${CASHFREE_PLAN_ID_PREFIX}_${planId}_${interval}_${Math.round(amount)}`
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .slice(0, 40);
}

export async function ensureCashfreePlan(input: CashfreePlanInput) {
  const path = `${CASHFREE_SUBSCRIPTION_PATHS.PLANS}/${encodeURIComponent(input.planId)}`;
  try {
    const existing = await subscriptionRequest<any>(path, { method: "GET" });
    if (existing?.plan_id) return String(existing.plan_id);
  } catch (error) {
    if (!(error instanceof CashfreeRequestError) || error.status !== 404) throw error;
  }
  const intervalType =
    CASHFREE_PLAN_INTERVAL_TYPES[input.interval as keyof typeof CASHFREE_PLAN_INTERVAL_TYPES] ||
    CASHFREE_PLAN_INTERVAL_TYPES.month;
  const created = await subscriptionRequest<any>(CASHFREE_SUBSCRIPTION_PATHS.PLANS, {
    method: "POST",
    body: {
      plan_id: input.planId,
      plan_name: input.name.slice(0, 40),
      plan_type: CASHFREE_PLAN_TYPES.PERIODIC,
      plan_currency: input.currency,
      plan_recurring_amount: Number(input.amount.toFixed(2)),
      plan_max_amount: Number(input.amount.toFixed(2)),
      plan_intervals: 1,
      plan_interval_type: intervalType,
      plan_note: input.note,
    },
  });
  if (!created?.plan_id) throw new Error("Cashfree did not return a plan id");
  return String(created.plan_id);
}

function toSubscriptionEntity(data: any): CashfreeSubscriptionEntity {
  return {
    subscriptionId: String(data?.subscription_id || ""),
    cfSubscriptionId: data?.cf_subscription_id ? String(data.cf_subscription_id) : undefined,
    sessionId: data?.subscription_session_id ? String(data.subscription_session_id) : undefined,
    status: String(data?.subscription_status || ""),
    nextScheduleDate: data?.next_schedule_date || undefined,
    firstChargeTime: data?.subscription_first_charge_time || undefined,
    expiryTime: data?.subscription_expiry_time || undefined,
    authorization: data?.authorisation_details || data?.authorization_details || undefined,
    planId: data?.plan_details?.plan_id ? String(data.plan_details.plan_id) : undefined,
    raw: data,
  };
}

export async function createCashfreeSubscription(input: CashfreeSubscriptionInput) {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setFullYear(expiry.getFullYear() + CASHFREE_SUBSCRIPTION_EXPIRY_YEARS);
  const firstCharge = addPlanInterval(now, input.interval);
  const data = await subscriptionRequest<any>(CASHFREE_SUBSCRIPTION_PATHS.SUBSCRIPTIONS, {
    method: "POST",
    body: {
      subscription_id: input.subscriptionId,
      customer_details: {
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
      },
      plan_details: {
        plan_id: input.cashfreePlanId,
        plan_name: input.planName.slice(0, 40),
        plan_type: CASHFREE_PLAN_TYPES.PERIODIC,
      },
      authorization_details: {
        authorization_amount: Number(input.amount.toFixed(2)),
        authorization_amount_refund: false,
        payment_methods: [...CASHFREE_SUBSCRIPTION_PAYMENT_METHODS],
      },
      subscription_meta: {
        return_url: input.returnUrl,
        notification_channel: [...CASHFREE_SUBSCRIPTION_NOTIFICATION_CHANNELS],
      },
      subscription_expiry_time: toIstIso(expiry),
      subscription_first_charge_time: toIstIso(firstCharge),
      subscription_tags: input.tags,
    },
  });
  const entity = toSubscriptionEntity(data);
  if (!entity.sessionId) throw new Error("Cashfree did not return a subscription session");
  return entity;
}

export async function fetchCashfreeSubscription(subscriptionId: string) {
  const data = await subscriptionRequest<any>(
    `${CASHFREE_SUBSCRIPTION_PATHS.SUBSCRIPTIONS}/${encodeURIComponent(subscriptionId)}`,
    { method: "GET" }
  );
  return toSubscriptionEntity(data);
}

export async function manageCashfreeSubscription(
  subscriptionId: string,
  action: (typeof CASHFREE_SUBSCRIPTION_ACTIONS)[keyof typeof CASHFREE_SUBSCRIPTION_ACTIONS],
  details?: Record<string, unknown>
) {
  const data = await subscriptionRequest<any>(
    `${CASHFREE_SUBSCRIPTION_PATHS.SUBSCRIPTIONS}/${encodeURIComponent(subscriptionId)}/manage`,
    { method: "POST", body: { subscription_id: subscriptionId, action, action_details: details } }
  );
  return toSubscriptionEntity(data);
}

export async function cancelCashfreeSubscription(subscriptionId: string) {
  return manageCashfreeSubscription(subscriptionId, CASHFREE_SUBSCRIPTION_ACTIONS.CANCEL);
}

export async function createCashfreeOrder(input: CashfreeOrderInput) {
  const data = await request<any>("/orders", {
    method: "POST",
    body: {
      order_id: input.orderId,
      order_amount: Number(input.amount.toFixed(2)),
      order_currency: input.currency,
      customer_details: {
        customer_id: input.customer.id,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
        customer_name: input.customer.name,
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
      order_note: input.note,
    },
  });
  if (!data?.payment_session_id) throw new Error("Cashfree did not return a payment session");
  return {
    orderId: String(data.order_id),
    paymentSessionId: String(data.payment_session_id),
    orderStatus: String(data.order_status || ""),
  };
}

export async function fetchCashfreeOrder(orderId: string) {
  return request<any>(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
}

export async function verifyCashfreePayment(orderId: string): Promise<CashfreePaymentResult> {
  const payments = await request<any[]>(`/orders/${encodeURIComponent(orderId)}/payments`, { method: "GET" });
  if (!Array.isArray(payments) || payments.length === 0) {
    return { success: false, message: "No payments found for this order" };
  }
  const successful = payments.find((p) => p.payment_status === CASHFREE_PAYMENT_SUCCESS_STATUS);
  if (successful) {
    return {
      success: true,
      paymentId: String(successful.cf_payment_id),
      amount: Number(successful.payment_amount),
      currency: successful.payment_currency,
      method: successful.payment_group,
      status: successful.payment_status,
    };
  }
  const latest = payments[0];
  return {
    success: false,
    status: latest.payment_status,
    message: latest.payment_message || "Payment not successful",
  };
}

export function verifyCashfreeWebhookSignature(rawBody: string, signature: string, timestamp: string) {
  const { secretKey } = credentials();
  const numeric = Number(timestamp);
  if (!Number.isFinite(numeric)) return false;
  const sentAt = timestamp.length > 11 ? numeric : numeric * 1000;
  if (Math.abs(Date.now() - sentAt) > CASHFREE_WEBHOOK_MAX_AGE_MS) return false;
  const expected = crypto.createHmac("sha256", secretKey).update(`${timestamp}${rawBody}`).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
