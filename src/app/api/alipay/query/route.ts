import { NextResponse } from "next/server";
import { isAlipayConfigured } from "@/lib/alipay/config";
import { findAlipayOrderByOutTradeNo } from "@/lib/alipay/orders";
import { getAlipayClient } from "@/lib/alipay/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const outTradeNo = searchParams.get("out_trade_no");
  if (!outTradeNo) {
    return NextResponse.json({ error: "缺少 out_trade_no" }, { status: 400 });
  }

  const order = findAlipayOrderByOutTradeNo(outTradeNo);
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  let alipayTrade: Record<string, unknown> | null = null;
  if (isAlipayConfigured()) {
    try {
      const client = getAlipayClient();
      const result = await client.exec("alipay.trade.query", {
        bizContent: { out_trade_no: outTradeNo },
      });
      alipayTrade = result as Record<string, unknown>;
    } catch {
      alipayTrade = null;
    }
  }

  return NextResponse.json({
    order: {
      outTradeNo: order.out_trade_no,
      subject: order.subject,
      totalAmount: order.total_amount,
      status: order.status,
      tradeNo: order.trade_no,
      paidAt: order.paid_at,
    },
    alipayTrade,
  });
}
