import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  EXPERIENCE_PLAN_ID,
  getOrderByOutTradeNo,
} from "@/lib/alipay/orders";
import { queryTrade } from "@/lib/alipay/service";

export async function GET(request: Request) {
  const user = await getCurrentUser();

  const { searchParams } = new URL(request.url);
  const outTradeNo = (searchParams.get("out_trade_no") || "").trim();
  if (!outTradeNo) {
    return NextResponse.json({ error: "缺少 out_trade_no" }, { status: 400 });
  }

  const order = getOrderByOutTradeNo(outTradeNo);
  if (!order) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  if (user) {
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }
  } else if (order.plan_id !== EXPERIENCE_PLAN_ID) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const result = await queryTrade(outTradeNo);
    return NextResponse.json({
      ok: true,
      localStatus: getOrderByOutTradeNo(outTradeNo)?.status,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
