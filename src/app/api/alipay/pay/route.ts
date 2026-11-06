import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isAlipayConfigured } from "@/lib/alipay/config";
import { DEMO_PAY_AMOUNT } from "@/lib/alipay/constants";
import {
  createDemoExperiencePagePay,
  isValidDemoPayAmount,
} from "@/lib/alipay/service";

const schema = z.object({
  amount: z.string().optional(),
});

export async function POST(request: Request) {
  if (!isAlipayConfigured()) {
    return NextResponse.json(
      {
        error:
          "支付宝未配置。请在 .env.local 中设置 ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY、ALIPAY_PUBLIC_KEY（沙箱可设 ALIPAY_SANDBOX=true）。",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数无效" }, { status: 400 });
  }

  if (!isValidDemoPayAmount(parsed.data.amount)) {
    return NextResponse.json(
      { error: `体验付款金额必须为 ¥${DEMO_PAY_AMOUNT}` },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();

  try {
    const { order, paymentHtml } = createDemoExperiencePagePay(user?.id);
    return NextResponse.json({
      ok: true,
      outTradeNo: order.out_trade_no,
      amount: order.total_amount,
      paymentHtml,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "创建支付失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
