import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createQueryJob,
  getQuotaInfo,
  listJobsForUser,
  updateJobStatus,
} from "@/lib/db";
import { getJumdataProvider } from "@/lib/jumdata";
import { isValidChinaMobile, normalizePhone } from "@/lib/phone";
import { z } from "zod";

const createSchema = z.object({
  phone: z.string().min(11).max(20),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const jobs = listJobsForUser(user.id);
  return NextResponse.json({ jobs });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入手机号码" }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isValidChinaMobile(phone)) {
    return NextResponse.json(
      { error: "请输入有效的中国大陆 11 位手机号" },
      { status: 400 },
    );
  }

  const quota = getQuotaInfo(user.id);
  if (quota.remaining <= 0) {
    return NextResponse.json(
      {
        error: "本月查询次数已用完，请下月再试或升级套餐",
        quota,
      },
      { status: 403 },
    );
  }

  try {
    const provider = getJumdataProvider();
    const { externalJobId } = await provider.submitMultiPlatformQuery(phone);
    const job = createQueryJob(user.id, phone, externalJobId);
    updateJobStatus(job.id, "processing");

    const updatedQuota = getQuotaInfo(user.id);
    return NextResponse.json({ job, quota: updatedQuota });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "提交查询失败，请稍后重试" },
      { status: 500 },
    );
  }
}
