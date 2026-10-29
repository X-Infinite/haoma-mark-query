"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type Quota = {
  remaining: number;
  limit: number;
  planName: string;
  used: number;
};

export default function QueryPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login?next=/query");
          return;
        }
        setQuota(data.subscription);
        setAuthChecked(true);
      });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/queries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "提交失败");
      if (data.quota) setQuota(data.quota);
      return;
    }
    if (data.quota) setQuota(data.quota);
    router.push(`/query/${data.job.id}`);
  }

  if (!authChecked) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">号码标记查询</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          输入待查中国大陆手机号，系统将异步向多平台发起查询。正式环境通常需 1–30
          分钟；当前演示模式会在数秒内返回模拟结果。
        </p>
      </div>

      {quota && (
        <Alert>
          <AlertTitle>{quota.planName}</AlertTitle>
          <AlertDescription>
            本月已用 {quota.used}/{quota.limit} 次，剩余 {quota.remaining} 次。
            配额用完后需等待下月重置或{" "}
            <Link href="/pricing" className="underline">
              升级套餐
            </Link>
            ，不支持单独购买加油包。
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>提交查询</CardTitle>
          <CardDescription>仅支持 11 位大陆手机号，不含 +86</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">手机号码</Label>
              <Input
                id="phone"
                inputMode="numeric"
                placeholder="例如 13800138000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={13}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (quota?.remaining ?? 0) <= 0}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  提交中…
                </>
              ) : (
                "开始多平台查询"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
