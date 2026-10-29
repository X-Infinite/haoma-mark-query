"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryStatusBadge } from "@/components/query-status-badge";
import type { JobStatus } from "@/lib/db";
import { ButtonLink } from "@/components/button-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Loader2 } from "lucide-react";

type ResultRow = {
  platform: string;
  platform_key: string;
  is_marked: number;
  mark_type: string | null;
  mark_label: string | null;
  appeal_url: string | null;
};

type Job = {
  id: string;
  status: JobStatus;
  phone_masked: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export function QueryDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/queries/${id}`);
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setJob(data.job);
    setResults(data.results);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const timer = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(timer);
  }, [job, load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <Alert variant="destructive">
        <AlertDescription>未找到该查询，请返回历史记录查看。</AlertDescription>
      </Alert>
    );
  }

  const inProgress = job.status === "pending" || job.status === "processing";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">查询详情</h1>
        <QueryStatusBadge status={job.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{job.phone_masked}</CardTitle>
          <CardDescription>
            提交时间 {new Date(job.created_at).toLocaleString("zh-CN")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {inProgress && (
            <div className="flex items-center gap-2 text-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在等待各平台返回结果，请耐心等待（通常 1–30 分钟）。
            </div>
          )}
          {job.status === "failed" && (
            <p className="text-destructive">{job.error_message ?? "查询失败"}</p>
          )}
          <p>
            本页信息仅供参考。是否申诉、能否取消标记，均以各平台官方审核结果为准。
          </p>
        </CardContent>
      </Card>

      {job.status === "completed" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">各平台标记情况</h2>
          <div className="grid gap-3">
            {results.map((r) => (
              <Card key={r.platform_key}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{r.platform}</CardTitle>
                    <span
                      className={
                        r.is_marked
                          ? "text-sm font-medium text-amber-600"
                          : "text-sm text-emerald-600"
                      }
                    >
                      {r.is_marked ? "存在标记" : "未发现标记"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {r.is_marked ? (
                    <p>
                      类型：{r.mark_type ?? "—"} · 来源：{r.mark_label ?? "—"}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      当前查询未返回有效标记，仍请以平台官方页面为准。
                    </p>
                  )}
                  {r.appeal_url && (
                    <a
                      href={r.appeal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      前往官方申诉
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {inProgress && results.length === 0 && (
        <Alert>
          <AlertTitle>处理中</AlertTitle>
          <AlertDescription>
            页面将自动刷新。您也可以稍后在「查询历史」中查看。
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <ButtonLink variant="outline" href="/history">
          查询历史
        </ButtonLink>
        <ButtonLink href="/query">再查一个号码</ButtonLink>
      </div>
    </div>
  );
}
