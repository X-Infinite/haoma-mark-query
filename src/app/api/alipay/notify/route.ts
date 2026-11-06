import { getAlipayClient } from "@/lib/alipay/client";
import { isAlipayConfigured } from "@/lib/alipay/config";
import {
  findAlipayOrderByOutTradeNo,
  markAlipayOrderPaid,
} from "@/lib/alipay/orders";

function parseFormBody(text: string): Record<string, string> {
  const params = new URLSearchParams(text);
  const data: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    data[key] = value;
  }
  return data;
}

export async function POST(request: Request) {
  if (!isAlipayConfigured()) {
    return new Response("failure", { status: 503 });
  }

  const rawBody = await request.text();
  const postData = parseFormBody(rawBody);

  try {
    const client = getAlipayClient();
    const verified = client.checkNotifySignV2(postData);
    if (!verified) {
      return new Response("failure", { status: 400 });
    }

    const outTradeNo = postData.out_trade_no;
    const tradeStatus = postData.trade_status;
    const totalAmount = postData.total_amount;
    const tradeNo = postData.trade_no;

    if (!outTradeNo) {
      return new Response("failure", { status: 400 });
    }

    const order = findAlipayOrderByOutTradeNo(outTradeNo);
    if (!order) {
      return new Response("failure", { status: 404 });
    }

    if (totalAmount && totalAmount !== order.total_amount) {
      return new Response("failure", { status: 400 });
    }

    if (
      tradeStatus === "TRADE_SUCCESS" ||
      tradeStatus === "TRADE_FINISHED"
    ) {
      if (tradeNo) {
        markAlipayOrderPaid(outTradeNo, tradeNo);
      }
    }

    return new Response("success", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("failure", { status: 500 });
  }
}
