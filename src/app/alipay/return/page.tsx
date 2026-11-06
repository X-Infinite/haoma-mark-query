"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ButtonLink } from "@/components/button-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type OrderSnapshot = {
  outTradeNo: string;
  subject: string;
  totalAmount: string;
  status: string;
  tradeNo: string | null;
  paidAt: string | null;
};

function ReturnContent() {
  const searchParams = useSearchParams();
  const outTradeNo =
    searchParams.get("out_trade_no") ?? searchParams.get("outTradeNo");
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(!!outTradeNo);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outTradeNo) return;
    fetch(`/api/alipay/query?out_trade_no=${encodeURIComponent(outTradeNo)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) setOrder(data.order);
        else setError(data.error ?? "无法查询订单");
      })
      .catch(() => setError("查询失败"))
      .finally(() => setLoading(false));
  }, [outTradeNo]);

  const tradeStatus = searchParams.get("trade_status");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>支付结果</CardTitle>
          <CardDescription>支付宝同步跳转页（最终以异步通知为准）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && (
            <Alert>
              <AlertTitle>
                {order?.status === "paid" ||
                tradeStatus === "TRADE_SUCCESS" ||
                tradeStatus === "TRADE_FINISHED"
                  ? "支付成功"
                  : "等待确认"}
              </AlertTitle>
              <AlertDescription className="space-y-1">
                {outTradeNo && <p>商户订单号：{outTradeNo}</p>}
                {order?.totalAmount && <p>金额：¥{order.totalAmount}</p>}
                {order?.tradeNo && <p>支付宝交易号：{order.tradeNo}</p>}
                {tradeStatus && <p>同步状态：{tradeStatus}</p>}
              </AlertDescription>
            </Alert>
          )}
          <ButtonLink href="/" className="w-full">
            返回首页
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AlipayReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
