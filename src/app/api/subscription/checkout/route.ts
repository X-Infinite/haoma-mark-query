import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuotaInfo, updateSubscription } from "@/lib/db";
import type { PlanId } from "@/lib/subscription";
import { PLANS } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({
  planId: z.enum(["free"]),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "付费套餐请走支付宝支付接口 /api/alipay/pay" },
      { status: 400 },
    );
  }

  const { planId } = parsed.data;
  updateSubscription(user.id, planId as PlanId, null);
  const quota = getQuotaInfo(user.id);
  const plan = PLANS[planId as PlanId];

  return NextResponse.json({
    ok: true,
    message: `已切换为「${plan.name}」`,
    quota,
  });
}
