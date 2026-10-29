import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getQuotaInfo, getSubscription } from "@/lib/db";
import { PLANS } from "@/lib/subscription";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const sub = getSubscription(user.id);
  const quota = getQuotaInfo(user.id);

  return NextResponse.json({
    subscription: sub,
    quota,
    plans: PLANS,
  });
}
