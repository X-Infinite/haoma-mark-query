import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuotaInfo, updateSubscription } from "@/lib/db";
import type { BillingPeriod, PlanId } from "@/lib/subscription";
import { PLANS } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({
  planId: z.enum(["free", "basic", "pro"]),
  billingPeriod: z.enum(["monthly", "yearly"]).optional(),
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

  const { planId } = parsed.data;
  let billingPeriod: BillingPeriod | null = parsed.data.billingPeriod ?? null;

  if (planId === "free") {
    billingPeriod = null;
  } else if (!billingPeriod) {
    billingPeriod = "monthly";
  }

  updateSubscription(user.id, planId as PlanId, billingPeriod);

  const quota = getQuotaInfo(user.id);
  const plan = PLANS[planId as PlanId];

  return NextResponse.json({
    ok: true,
    demo: true,
    message: `演示模式：已模拟开通「${plan.name}」${billingPeriod === "yearly" ? "（年付）" : billingPeriod === "monthly" ? "（月付）" : ""}，未发生真实扣款。`,
    quota,
  });
}
