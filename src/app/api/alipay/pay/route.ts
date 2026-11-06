import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutOrder } from "@/lib/alipay/service";

const schema = z.object({
  planId: z.enum(["basic", "pro"]),
  billingPeriod: z.enum(["monthly", "yearly"]).default("monthly"),
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

  try {
    const { order, paymentHtml } = createCheckoutOrder({
      userId: user.id,
      planId: parsed.data.planId,
      billingPeriod: parsed.data.billingPeriod,
    });
    return NextResponse.json({
      ok: true,
      outTradeNo: order.out_trade_no,
      totalAmount: order.total_amount,
      subject: order.subject,
      paymentHtml,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "下单失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
