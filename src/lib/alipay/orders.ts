import { v4 as uuidv4 } from "uuid";
import { getDb } from "@/lib/db";

export type AlipayOrderStatus = "pending" | "paid" | "closed";

export interface AlipayOrderRow {
  id: string;
  out_trade_no: string;
  user_id: string | null;
  subject: string;
  total_amount: string;
  status: AlipayOrderStatus;
  trade_no: string | null;
  created_at: string;
  paid_at: string | null;
}

export function createAlipayOrder(input: {
  subject: string;
  totalAmount: string;
  userId?: string | null;
}): AlipayOrderRow {
  const id = uuidv4();
  const outTradeNo = `JP${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const database = getDb();
  database
    .prepare(
      `INSERT INTO alipay_orders (id, out_trade_no, user_id, subject, total_amount, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
    )
    .run(id, outTradeNo, input.userId ?? null, input.subject, input.totalAmount);

  return database
    .prepare("SELECT * FROM alipay_orders WHERE id = ?")
    .get(id) as AlipayOrderRow;
}

export function findAlipayOrderByOutTradeNo(
  outTradeNo: string,
): AlipayOrderRow | undefined {
  return getDb()
    .prepare("SELECT * FROM alipay_orders WHERE out_trade_no = ?")
    .get(outTradeNo) as AlipayOrderRow | undefined;
}

export function markAlipayOrderPaid(outTradeNo: string, tradeNo: string) {
  getDb()
    .prepare(
      `UPDATE alipay_orders
       SET status = 'paid', trade_no = ?, paid_at = datetime('now')
       WHERE out_trade_no = ? AND status = 'pending'`,
    )
    .run(tradeNo, outTradeNo);
}
