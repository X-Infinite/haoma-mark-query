import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonServerError } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth";
import { findUserByEmail } from "@/lib/db";
import { amountEquals } from "@/lib/alipay/client";
import {
  createExperiencePagePay,
  EXPERIENCE_PAY_AMOUNT,
} from "@/lib/alipay/service";

const schema = z.object({
  amount: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数无效" }, { status: 400 });
    }

    if (
      parsed.data.amount !== undefined &&
      !amountEquals(EXPERIENCE_PAY_AMOUNT, parsed.data.amount)
    ) {
      return NextResponse.json(
        { error: `体验付款金额必须为 ¥${EXPERIENCE_PAY_AMOUNT}` },
        { status: 400 },
      );
    }

    const sessionUser = await getCurrentUser();
    const user = sessionUser ?? findUserByEmail("demo@example.com");
    if (!user) {
      return NextResponse.json({ error: "系统未就绪" }, { status: 503 });
    }

    const { order, paymentHtml } = createExperiencePagePay(user.id);
    return NextResponse.json({
      ok: true,
      outTradeNo: order.out_trade_no,
      totalAmount: order.total_amount,
      subject: order.subject,
      paymentHtml,
    });
  } catch (error) {
    return jsonServerError(error, "下单失败");
  }
}
