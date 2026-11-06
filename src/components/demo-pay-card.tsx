"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

function submitPaymentHtml(paymentHtml: string) {
  const container = document.createElement("div");
  container.innerHTML = paymentHtml;
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.zIndex = "9999";
  container.style.background = "white";
  document.body.appendChild(container);
  const form = container.querySelector("form");
  if (form) form.submit();
}

export function DemoPayCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startPay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/alipay/demo-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "0.10" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "发起支付失败");
        return;
      }
      if (!data.paymentHtml) {
        setError("未收到支付表单");
        return;
      }
      submitPaymentHtml(data.paymentHtml);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-dashed">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">0.1 元体验付款</CardTitle>
        <CardDescription>
          支付宝 AI 网页应用收款（电脑网站支付 page.pay），用于沙箱联调
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-center">
        <p className="text-3xl font-bold tracking-tight">¥0.10</p>
        <p className="text-sm text-muted-foreground">机凤凰体验付款 · 无需登录</p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          className="w-full"
          variant="secondary"
          disabled={loading}
          onClick={startPay}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              跳转支付宝…
            </>
          ) : (
            "支付宝支付 0.1 元"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
