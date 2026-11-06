import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";
import type { BillingPeriod, PlanId } from "@/lib/subscription";

/** 首页 0.1 元体验单，不走套餐开通 */
export const EXPERIENCE_PLAN_ID = "experience" as const;

export type PaymentOrderPlanId = PlanId | typeof EXPERIENCE_PLAN_ID;

export type PaymentOrderStatus =
  | "created"
  | "pending_payment"
  | "paid"
  | "closed"
  | "refunded"
  | "partial_refunded";

export interface PaymentOrderRow {
  id: string;
  out_trade_no: string;
  user_id: string;
  plan_id: PaymentOrderPlanId;
  billing_period: BillingPeriod;
  total_amount: string;
  subject: string;
  status: PaymentOrderStatus;
  trade_no: string | null;
  refunded_amount: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface RefundRow {
  id: string;
  out_trade_no: string;
  out_request_no: string;
  refund_amount: string;
  refund_reason: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

let schemaReady = false;

export function ensurePaymentSchema() {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      out_trade_no TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL,
      billing_period TEXT NOT NULL,
      total_amount TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      trade_no TEXT,
      refunded_amount TEXT NOT NULL DEFAULT '0.00',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_notify_events (
      notify_id TEXT PRIMARY KEY,
      trade_no TEXT,
      out_trade_no TEXT NOT NULL,
      trade_status TEXT,
      raw_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_refunds (
      id TEXT PRIMARY KEY,
      out_trade_no TEXT NOT NULL,
      out_request_no TEXT NOT NULL UNIQUE,
      refund_amount TEXT NOT NULL,
      refund_reason TEXT,
      status TEXT NOT NULL DEFAULT 'requested',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id, created_at DESC);
  `);
  schemaReady = true;
}

export function createPaymentOrder(input: {
  userId: string;
  planId: PaymentOrderPlanId;
  billingPeriod: BillingPeriod;
  totalAmount: string;
  subject: string;
}): PaymentOrderRow {
  ensurePaymentSchema();
  const id = uuidv4();
  const outTradeNo = `HM${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
  const db = getDb();
  db.prepare(
    `INSERT INTO payment_orders
      (id, out_trade_no, user_id, plan_id, billing_period, total_amount, subject, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'created')`,
  ).run(
    id,
    outTradeNo,
    input.userId,
    input.planId,
    input.billingPeriod,
    input.totalAmount,
    input.subject,
  );
  return getOrderByOutTradeNo(outTradeNo)!;
}

export function getOrderByOutTradeNo(
  outTradeNo: string,
): PaymentOrderRow | undefined {
  ensurePaymentSchema();
  return getDb()
    .prepare("SELECT * FROM payment_orders WHERE out_trade_no = ?")
    .get(outTradeNo) as PaymentOrderRow | undefined;
}

export function getOrderById(id: string): PaymentOrderRow | undefined {
  ensurePaymentSchema();
  return getDb()
    .prepare("SELECT * FROM payment_orders WHERE id = ?")
    .get(id) as PaymentOrderRow | undefined;
}

export function markOrderPending(outTradeNo: string) {
  ensurePaymentSchema();
  getDb()
    .prepare(
      `UPDATE payment_orders SET status = 'pending_payment', updated_at = datetime('now')
       WHERE out_trade_no = ? AND status IN ('created', 'pending_payment')`,
    )
    .run(outTradeNo);
}

export function markOrderPaidIdempotently(
  outTradeNo: string,
  tradeNo: string,
): boolean {
  ensurePaymentSchema();
  const result = getDb()
    .prepare(
      `UPDATE payment_orders
       SET status = 'paid', trade_no = ?, paid_at = COALESCE(paid_at, datetime('now')),
           updated_at = datetime('now')
       WHERE out_trade_no = ? AND status != 'paid'`,
    )
    .run(tradeNo, outTradeNo);
  return result.changes > 0;
}

export function markOrderClosed(outTradeNo: string) {
  ensurePaymentSchema();
  getDb()
    .prepare(
      `UPDATE payment_orders SET status = 'closed', updated_at = datetime('now')
       WHERE out_trade_no = ? AND status IN ('created', 'pending_payment')`,
    )
    .run(outTradeNo);
}

export function insertNotifyOnce(input: {
  notifyId: string;
  tradeNo?: string;
  outTradeNo: string;
  tradeStatus?: string;
  rawParams: Record<string, unknown>;
}): boolean {
  ensurePaymentSchema();
  try {
    getDb()
      .prepare(
        `INSERT INTO payment_notify_events (notify_id, trade_no, out_trade_no, trade_status, raw_json)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.notifyId,
        input.tradeNo ?? null,
        input.outTradeNo,
        input.tradeStatus ?? null,
        JSON.stringify(input.rawParams),
      );
    return true;
  } catch {
    return false;
  }
}

export function createRefundRecord(input: {
  outTradeNo: string;
  outRequestNo: string;
  refundAmount: string;
  refundReason?: string;
}): RefundRow {
  ensurePaymentSchema();
  const id = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO payment_refunds (id, out_trade_no, out_request_no, refund_amount, refund_reason, status)
       VALUES (?, ?, ?, ?, ?, 'requested')`,
    )
    .run(
      id,
      input.outTradeNo,
      input.outRequestNo,
      input.refundAmount,
      input.refundReason ?? null,
    );
  return getDb()
    .prepare("SELECT * FROM payment_refunds WHERE id = ?")
    .get(id) as RefundRow;
}

export function updateRefundStatus(outRequestNo: string, status: string) {
  ensurePaymentSchema();
  getDb()
    .prepare(
      `UPDATE payment_refunds SET status = ?, updated_at = datetime('now') WHERE out_request_no = ?`,
    )
    .run(status, outRequestNo);
}

export function getRefundByOutRequestNo(
  outRequestNo: string,
): RefundRow | undefined {
  ensurePaymentSchema();
  return getDb()
    .prepare("SELECT * FROM payment_refunds WHERE out_request_no = ?")
    .get(outRequestNo) as RefundRow | undefined;
}

export function addRefundedAmount(outTradeNo: string, amount: string) {
  ensurePaymentSchema();
  const order = getOrderByOutTradeNo(outTradeNo);
  if (!order) return;
  const prev = Number(order.refunded_amount);
  const add = Number(amount);
  const next = (prev + add).toFixed(2);
  const status =
    Number(next) >= Number(order.total_amount) ? "refunded" : "partial_refunded";
  getDb()
    .prepare(
      `UPDATE payment_orders SET refunded_amount = ?, status = ?, updated_at = datetime('now')
       WHERE out_trade_no = ?`,
    )
    .run(next, status, outTradeNo);
}

export function isSubscriptionPlan(
  planId: PaymentOrderPlanId,
): planId is Exclude<PlanId, "free"> {
  return planId === "basic" || planId === "pro";
}
