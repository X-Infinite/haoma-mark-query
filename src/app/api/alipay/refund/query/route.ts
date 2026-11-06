import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrderByOutTradeNo } from "@/lib/alipay/orders";
import { queryRefund } from "@/lib/alipay/service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const outTradeNo = (searchParams.get("out_trade_no") || "").trim();
  const outRequestNo = (searchParams.get("out_request_no") || "").trim();
  if (!outTradeNo || !outRequestNo) {
    return NextResponse.json(
      { error: "缺少 out_trade_no 或 out_request_no" },
      { status: 400 },
    );
  }

  const order = getOrderByOutTradeNo(outTradeNo);
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  try {
    const result = await queryRefund({ outTradeNo, outRequestNo });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "退款查询失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
