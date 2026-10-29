"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QueryStatusBadge } from "@/components/query-status-badge";
import type { JobStatus } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ButtonLink } from "@/components/button-link";
import { Loader2 } from "lucide-react";

type Job = {
  id: string;
  phone_number: string;
  status: JobStatus;
  created_at: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/queries")
      .then(async (r) => {
        if (r.status === 401) {
          router.replace("/login?next=/history");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.jobs) setJobs(data.jobs);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">查询历史</h1>
          <p className="text-sm text-muted-foreground">最近 50 条多平台查询记录</p>
        </div>
        <ButtonLink href="/query">新建查询</ButtonLink>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>暂无记录</CardTitle>
            <CardDescription>提交第一次查询后将显示在这里</CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink href="/query">去查询</ButtonLink>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/query/${job.id}`}
                className="block rounded-xl border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{maskPhone(job.phone_number)}</span>
                  <QueryStatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString("zh-CN")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
