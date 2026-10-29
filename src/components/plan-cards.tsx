"use client";

import { PLANS, type PlanId } from "@/lib/subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/button-link";

export function PlanCards({ highlight }: { highlight?: PlanId }) {
  const order: PlanId[] = ["free", "basic", "pro"];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {order.map((id) => {
        const plan = PLANS[id];
        const isHighlight = highlight === id || id === "basic";
        return (
          <Card
            key={id}
            className={isHighlight ? "border-primary shadow-md" : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{plan.name}</CardTitle>
                {id === "basic" && <Badge>推荐</Badge>}
              </div>
              <CardDescription>
                {plan.priceMonthly === 0 ? (
                  "永久免费"
                ) : (
                  <>
                    ¥{plan.priceMonthly}/月 · 年付 ¥{plan.priceYearly}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-2xl font-bold">
                每月 {plan.monthlyQuota} 次
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  多平台查询
                </span>
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <ButtonLink
                className="w-full"
                variant={id === "free" ? "outline" : "default"}
                href={id === "free" ? "/register" : "/pricing"}
              >
                {id === "free" ? "免费开始" : "查看订阅"}
              </ButtonLink>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
