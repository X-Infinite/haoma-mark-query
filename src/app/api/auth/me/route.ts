import { NextResponse } from "next/server";
import { getCurrentUser, sanitizeUser } from "@/lib/auth";
import { getQuotaInfo } from "@/lib/db";
import { PLANS } from "@/lib/subscription";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const quota = getQuotaInfo(user.id);
  return NextResponse.json({
    user: sanitizeUser(user),
    subscription: {
      planId: quota.planId,
      planName: PLANS[quota.planId].name,
      billingPeriod: quota.billingPeriod,
      status: quota.status,
      periodKey: quota.periodKey,
      used: quota.used,
      limit: quota.limit,
      remaining: quota.remaining,
    },
  });
}
