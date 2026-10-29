import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getJobById, getQuotaInfo, getResultsForJob } from "@/lib/db";
import { maskPhone } from "@/lib/phone";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const job = getJobById(id, user.id);
  if (!job) {
    return NextResponse.json({ error: "未找到查询记录" }, { status: 404 });
  }

  const results = getResultsForJob(job.id);
  const quota = getQuotaInfo(user.id);

  return NextResponse.json({
    job: {
      ...job,
      phone_masked: maskPhone(job.phone_number),
    },
    results,
    quota,
  });
}
