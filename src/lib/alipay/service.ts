import { PLANS, type BillingPeriod, type PlanId } from "@/lib/subscription";
import { updateSubscription } from "@/lib/db";
import {
  amountEquals,
  createAlipaySdk,
  getAlipaySdk,
  mapTradeStatus,
  normalizeAmountText,
} from "./client";
import { getAlipayRuntimeConfig } from "./config";
import {
  addRefundedAmount,
  createPaymentOrder,
  createRefundRecord,
  EXPERIENCE_PLAN_ID,
  getOrderByOutTradeNo,
  getRefundByOutRequestNo,
  insertNotifyOnce,
  isSubscriptionPlan,
  markOrderClosed,
  markOrderPaidIdempotently,
  markOrderPending,
  updateRefundStatus,
  type PaymentOrderRow,
} from "./orders";

export const EXPERIENCE_PAY_AMOUNT = "0.10";
export const EXPERIENCE_PAY_SUBJECT = "机凤凰体验付款";

export function buildPagePayHtml(order: PaymentOrderRow): string {
  const cfg = getAlipayRuntimeConfig();
  const sdk = getAlipaySdk();
  const requestOptions: {
    returnUrl: string;
    notifyUrl?: string;
    bizContent: Record<string, string>;
  } = {
    returnUrl: cfg.returnUrl,
    bizContent: {
      out_trade_no: order.out_trade_no,
      total_amount: order.total_amount,
      subject: order.subject,
      product_code: "FAST_INSTANT_TRADE_PAY",
    },
  };
  if (cfg.notifyUrl) {
    requestOptions.notifyUrl = cfg.notifyUrl;
  }
  const html = sdk.pageExec("alipay.trade.page.pay", "POST", requestOptions);
  markOrderPending(order.out_trade_no);
  return html;
}

function applyPaidSubscriptionSideEffects(order: PaymentOrderRow) {
  if (isSubscriptionPlan(order.plan_id)) {
    updateSubscription(order.user_id, order.plan_id, order.billing_period);
  }
}

export function createCheckoutOrder(input: {
  userId: string;
  planId: Exclude<PlanId, "free">;
  billingPeriod: BillingPeriod;
}): { order: PaymentOrderRow; paymentHtml: string } {
  const plan = PLANS[input.planId];
  const amount =
    input.billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const totalAmount = normalizeAmountText(amount.toFixed(2));
  if (!totalAmount || Number(totalAmount) < 0.01) {
    throw new Error("订单金额无效");
  }
  const subject = `机凤凰${plan.name}${input.billingPeriod === "yearly" ? "年付" : "月付"}`;
  const order = createPaymentOrder({
    userId: input.userId,
    planId: input.planId,
    billingPeriod: input.billingPeriod,
    totalAmount,
    subject,
  });
  const paymentHtml = buildPagePayHtml(order);
  return { order, paymentHtml };
}

export function createExperiencePagePay(userId: string): {
  order: PaymentOrderRow;
  paymentHtml: string;
} {
  const totalAmount = normalizeAmountText(EXPERIENCE_PAY_AMOUNT);
  if (!totalAmount || totalAmount !== EXPERIENCE_PAY_AMOUNT) {
    throw new Error("体验付款金额无效");
  }
  const order = createPaymentOrder({
    userId,
    planId: EXPERIENCE_PLAN_ID,
    billingPeriod: "monthly",
    totalAmount,
    subject: EXPERIENCE_PAY_SUBJECT,
  });
  const paymentHtml = buildPagePayHtml(order);
  return { order, paymentHtml };
}

export async function queryTrade(outTradeNo: string) {
  const sdk = getAlipaySdk();
  const result = await sdk.exec("alipay.trade.query", {
    bizContent: { out_trade_no: outTradeNo },
  });
  const businessState = mapTradeStatus(result.trade_status);
  if (result.code === "10000" && businessState === "PAID") {
    const order = getOrderByOutTradeNo(outTradeNo);
    if (order && order.status !== "paid") {
      const changed = markOrderPaidIdempotently(
        outTradeNo,
        String(result.trade_no || ""),
      );
      if (changed) {
        applyPaidSubscriptionSideEffects(order);
      }
    }
  }
  return {
    code: result.code,
    msg: result.msg,
    subCode: result.sub_code,
    subMsg: result.sub_msg,
    tradeNo: result.trade_no,
    outTradeNo: result.out_trade_no ?? outTradeNo,
    tradeStatus: result.trade_status,
    businessState,
    totalAmount: result.total_amount,
    planId: getOrderByOutTradeNo(outTradeNo)?.plan_id,
  };
}

export async function refundTrade(input: {
  outTradeNo: string;
  refundAmount: string;
  refundReason?: string;
  outRequestNo?: string;
}) {
  const order = getOrderByOutTradeNo(input.outTradeNo);
  if (!order) throw new Error("订单不存在");
  if (order.status !== "paid" && order.status !== "partial_refunded") {
    throw new Error("订单未支付，无法退款");
  }
  const refundAmount = normalizeAmountText(input.refundAmount);
  if (!refundAmount) throw new Error("退款金额无效");
  const already = Number(order.refunded_amount);
  const total = Number(order.total_amount);
  if (already + Number(refundAmount) > total + 1e-9) {
    throw new Error("累计退款金额超过订单实付金额");
  }

  const outRequestNo =
    input.outRequestNo ||
    `RF${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;

  let refundRow = getRefundByOutRequestNo(outRequestNo);
  if (!refundRow) {
    refundRow = createRefundRecord({
      outTradeNo: input.outTradeNo,
      outRequestNo,
      refundAmount,
      refundReason: input.refundReason,
    });
  }

  const sdk = getAlipaySdk();
  const result = await sdk.exec("alipay.trade.refund", {
    bizContent: {
      out_trade_no: input.outTradeNo,
      refund_amount: refundAmount,
      refund_reason: input.refundReason || "正常退款",
      out_request_no: outRequestNo,
    },
  });

  if (result.code === "10000") {
    if (result.fund_change === "Y") {
      updateRefundStatus(outRequestNo, "REFUND_SUCCESS");
      addRefundedAmount(input.outTradeNo, refundAmount);
    } else {
      updateRefundStatus(outRequestNo, "PENDING_CONFIRM");
    }
  } else {
    updateRefundStatus(outRequestNo, "FAILED");
  }

  return {
    code: result.code,
    msg: result.msg,
    fundChange: result.fund_change,
    refundFee: result.refund_fee,
    outRequestNo,
    tradeNo: result.trade_no,
    needRefundQuery: result.code === "10000" && result.fund_change !== "Y",
  };
}

export async function queryRefund(input: {
  outTradeNo: string;
  outRequestNo: string;
}) {
  const sdk = getAlipaySdk();
  const result = await sdk.exec("alipay.trade.fastpay.refund.query", {
    bizContent: {
      out_trade_no: input.outTradeNo,
      out_request_no: input.outRequestNo,
    },
  });
  if (result.code === "10000" && result.refund_status === "REFUND_SUCCESS") {
    const refund = getRefundByOutRequestNo(input.outRequestNo);
    const prevStatus = refund?.status;
    updateRefundStatus(input.outRequestNo, "REFUND_SUCCESS");
    if (
      refund &&
      prevStatus !== "REFUND_SUCCESS" &&
      normalizeAmountText(refund.refund_amount)
    ) {
      addRefundedAmount(input.outTradeNo, refund.refund_amount);
    }
  }
  return {
    code: result.code,
    msg: result.msg,
    refundStatus: result.refund_status,
    refundAmount: result.refund_amount,
    outRequestNo: result.out_request_no,
    outTradeNo: result.out_trade_no,
    tradeNo: result.trade_no,
  };
}

export async function closeTrade(outTradeNo: string) {
  const order = getOrderByOutTradeNo(outTradeNo);
  if (!order) throw new Error("订单不存在");
  if (order.status === "paid") {
    throw new Error("已支付订单不可关闭");
  }
  const sdk = getAlipaySdk();
  const result = await sdk.exec("alipay.trade.close", {
    bizContent: { out_trade_no: outTradeNo },
  });
  if (result.code === "10000") {
    markOrderClosed(outTradeNo);
  }
  return {
    code: result.code,
    msg: result.msg,
    outTradeNo: result.out_trade_no ?? outTradeNo,
    tradeNo: result.trade_no,
  };
}

function expectedSellerMatches(
  sellerId: string | undefined,
  sellerEmail: string | null | undefined,
  cfgSellerId: string,
  cfgSellerEmail: string | null,
): boolean {
  return Boolean(
    (cfgSellerId && sellerId === cfgSellerId) ||
      (cfgSellerEmail && sellerEmail === cfgSellerEmail),
  );
}

function isPaidTradeNotification(params: Record<string, string>): boolean {
  const paid =
    params.trade_status === "TRADE_SUCCESS" ||
    params.trade_status === "TRADE_FINISHED";
  return paid && !params.out_biz_no && !params.gmt_refund && !params.refund_fee;
}

function sanitizeNotifyParams(params: Record<string, string>) {
  const { sign: _sign, ...safe } = params;
  return safe;
}

export async function handleAlipayNotify(
  params: Record<string, string>,
): Promise<"success" | "fail"> {
  try {
    const cfg = getAlipayRuntimeConfig();
    if (!params.app_id || params.app_id !== cfg.appId) {
      console.warn("alipay notify app config mismatch", sanitizeNotifyParams(params));
      return "fail";
    }
    const sdk = createAlipaySdk(cfg);
    if (typeof sdk.checkNotifySignV2 !== "function") {
      throw new Error("current alipay-sdk does not expose checkNotifySignV2");
    }
    if (!sdk.checkNotifySignV2(params)) {
      console.warn("alipay notify signature check failed", sanitizeNotifyParams(params));
      return "fail";
    }

    const order = getOrderByOutTradeNo(params.out_trade_no);
    if (
      !order ||
      !amountEquals(order.total_amount, params.total_amount) ||
      !expectedSellerMatches(
        params.seller_id,
        params.seller_email,
        cfg.sellerId,
        cfg.sellerEmail,
      )
    ) {
      console.warn("alipay notify business check failed", sanitizeNotifyParams(params));
      return "fail";
    }

    if (!params.notify_id) {
      return "fail";
    }

    const inserted = insertNotifyOnce({
      notifyId: params.notify_id,
      tradeNo: params.trade_no,
      outTradeNo: params.out_trade_no,
      tradeStatus: params.trade_status,
      rawParams: sanitizeNotifyParams(params),
    });
    if (!inserted) {
      return "success";
    }

    if (isPaidTradeNotification(params)) {
      const changed = markOrderPaidIdempotently(
        order.out_trade_no,
        params.trade_no || "",
      );
      if (changed) {
        applyPaidSubscriptionSideEffects(order);
      }
    }

    return "success";
  } catch {
    console.warn("alipay notify unexpected exception");
    return "fail";
  }
}
