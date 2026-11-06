import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrderByOutTradeNo } from "@/lib/alipay/orders";
import { refundTrade } from "@/lib/alipay/service";

const schema = z.object({
  outTradeNo: z.string().min(1),
  refundAmount: z.string().min(1),
  refundReason: z.string().optional(),
  outRequestNo: z.string().optional(),
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
    const result = await refundTrade(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "退款失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
