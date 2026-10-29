"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type BillingPeriod, type PlanId } from "@/lib/subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [message, setMessage] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setAuth(!!data.user);
        if (data.subscription?.planId) {
          setCurrentPlan(data.subscription.planId);
        }
      });
  }, []);

  async function checkout(planId: PlanId) {
    if (!auth) {
      router.push("/login?next=/pricing");
      return;
    }
    setLoadingPlan(planId);
    setMessage(null);
    const res = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        billingPeriod: planId === "free" ? undefined : billing,
      }),
    });
    const data = await res.json();
    setLoadingPlan(null);
    if (!res.ok) {
      setMessage(data.error ?? "开通失败");
      return;
    }
    setCurrentPlan(planId);
    setMessage(data.message);
    router.refresh();
  }

  const order: PlanId[] = ["free", "basic", "pro"];

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">套餐与订阅</h1>
        <p className="text-sm text-muted-foreground">
          按自然月统计查询次数；用尽后请等待下月或升级，不提供按次加油包。
        </p>
      </div>

      <Alert>
        <AlertTitle>演示收银台</AlertTitle>
        <AlertDescription>
          下方「模拟开通」仅在本地数据库中更新套餐，不会产生真实支付。上线时请接入微信/支付宝等正式支付。
        </AlertDescription>
      </Alert>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Tabs
          value={billing}
          onValueChange={(v) => setBilling(v as BillingPeriod)}
        >
          <TabsList>
            <TabsTrigger value="monthly">月付</TabsTrigger>
            <TabsTrigger value="yearly">年付更省</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {order.map((id) => {
          const plan = PLANS[id];
          const price =
            id === "free"
              ? 0
              : billing === "yearly"
                ? plan.priceYearly
                : plan.priceMonthly;
          const isCurrent = currentPlan === id;
          return (
            <Card key={id} className={id === "basic" ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {id === "basic" && <Badge>推荐</Badge>}
                  {isCurrent && <Badge variant="secondary">当前</Badge>}
                </div>
                <CardDescription>
                  每月 {plan.monthlyQuota} 次多平台查询
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {price === 0 ? (
                    "免费"
                  ) : (
                    <>
                      ¥{price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{billing === "yearly" ? "年" : "月"}
                      </span>
                    </>
                  )}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={id === "free" ? "outline" : "default"}
                  disabled={isCurrent || loadingPlan === id}
                  onClick={() => checkout(id)}
                >
                  {loadingPlan === id ? (
                    <Loader2 className="animate-spin" />
                  ) : isCurrent ? (
                    "当前套餐"
                  ) : id === "free" ? (
                    "切换为免费版"
                  ) : (
                    "模拟开通（演示）"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
