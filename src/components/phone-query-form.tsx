"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

type PhoneQueryFormProps = {
  variant?: "minimal" | "default";
  /** When true, redirect to login if the user is not signed in (query page). */
  requireAuthOnMount?: boolean;
};

export function PhoneQueryForm({
  variant = "default",
  requireAuthOnMount = false,
}: PhoneQueryFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [quota, setQuota] = useState<Quota | null>(null);
  const [authChecked, setAuthChecked] = useState(!requireAuthOnMount);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (requireAuthOnMount && !data.user) {
          router.replace("/login?next=/query");
          return;
        }
        if (data.subscription) setQuota(data.subscription);
        setAuthChecked(true);
      })
      .catch(() => {
        if (requireAuthOnMount) {
          router.replace("/login?next=/query");
          return;
        }
        setAuthChecked(true);
      });
  }, [router, requireAuthOnMount]);

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
    if (res.status === 401) {
      router.push(
        variant === "minimal" ? "/login?next=/" : "/login?next=/query",
      );
      return;
    }
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

  const noQuota = requireAuthOnMount && (quota?.remaining ?? 0) <= 0;

  const formFields = (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {variant === "minimal" ? (
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            id="phone"
            inputMode="numeric"
            placeholder="输入 11 位手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={13}
            required
            className="flex-1"
            aria-label="手机号码"
          />
          <Button
            type="submit"
            className="sm:shrink-0"
            disabled={loading || noQuota}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                查询中…
              </>
            ) : (
              "查询"
            )}
          </Button>
        </div>
      ) : (
        <>
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
          <Button type="submit" className="w-full" disabled={loading || noQuota}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                提交中…
              </>
            ) : (
              "开始多平台查询"
            )}
          </Button>
        </>
      )}
    </>
  );

  if (variant === "minimal") {
    return (
      <form onSubmit={submit} className="w-full max-w-md px-4">
        {formFields}
      </form>
    );
  }

  return (
    <div className="space-y-6">
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
            {formFields}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
