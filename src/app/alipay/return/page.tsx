"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/button-link";
import { Loader2 } from "lucide-react";

type QueryResult = {
  ok?: boolean;
  businessState?: string;
  tradeStatus?: string;
  localStatus?: string;
  outTradeNo?: string;
  planId?: string;
  error?: string;
};

function ReturnContent() {
  const searchParams = useSearchParams();
  const outTradeNo =
    searchParams.get("out_trade_no") || searchParams.get("outTradeNo") || "";
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!outTradeNo) {
        setLoading(false);
        setResult({ error: "缺少订单号，无法确认支付结果" });
        return;
      }
      try {
        const res = await fetch(
          `/api/alipay/query?out_trade_no=${encodeURIComponent(outTradeNo)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setResult(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setResult({ error: "查询支付结果失败，请稍后在历史订单中确认" });
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [outTradeNo]);

  const paid =
    result?.businessState === "PAID" || result?.localStatus === "paid";
  const isExperience = result?.planId === "experience";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>支付结果确认</CardTitle>
          <CardDescription>
            同步回跳仅表示支付流程结束，最终结果以服务端交易查询为准。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在确认支付结果…
            </div>
          ) : result?.error ? (
            <Alert>
              <AlertTitle>无法确认</AlertTitle>
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          ) : paid ? (
            <Alert>
              <AlertTitle>支付成功</AlertTitle>
              <AlertDescription>
                订单 {result?.outTradeNo || outTradeNo} 已确认支付
                {isExperience ? "（体验付款）" : "，套餐已开通"}。
              </AlertDescription>
            </Alert>
          ) : result?.businessState === "PENDING_PAYMENT" ? (
            <Alert>
              <AlertTitle>等待付款</AlertTitle>
              <AlertDescription>
                尚未检测到付款完成，若已支付请稍候刷新或稍后在套餐页查看。
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>结果待确认</AlertTitle>
              <AlertDescription>
                当前状态：{result?.tradeStatus || result?.businessState || "未知"}。
                请勿仅依据回跳参数判断成败。
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <ButtonLink href="/pricing">返回套餐</ButtonLink>
            <ButtonLink href="/" variant="outline">
              回到首页
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AlipayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在确认支付结果…
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
