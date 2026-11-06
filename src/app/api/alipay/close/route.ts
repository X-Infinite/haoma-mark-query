import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrderByOutTradeNo } from "@/lib/alipay/orders";
import { closeTrade } from "@/lib/alipay/service";

const schema = z.object({
  outTradeNo: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  const order = getOrderByOutTradeNo(parsed.data.outTradeNo);
  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  }

  try {
    const result = await closeTrade(parsed.data.outTradeNo);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "关单失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
