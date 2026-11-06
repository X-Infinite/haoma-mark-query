import { getAlipayClient } from "./client";
import { getAppBaseUrl } from "./config";
import {
  DEMO_PAY_AMOUNT,
  DEMO_PAY_SUBJECT,
  PAGE_PAY_PRODUCT_CODE,
} from "./constants";
import { createAlipayOrder, type AlipayOrderRow } from "./orders";

export function buildPagePayHtml(order: AlipayOrderRow): string {
  const baseUrl = getAppBaseUrl();
  const client = getAlipayClient();

  return client.pageExec("alipay.trade.page.pay", "POST", {
    notifyUrl: `${baseUrl}/api/alipay/notify`,
    returnUrl: `${baseUrl}/alipay/return`,
    bizContent: {
      out_trade_no: order.out_trade_no,
      product_code: PAGE_PAY_PRODUCT_CODE,
      total_amount: order.total_amount,
      subject: order.subject,
    },
  });
}

export function createDemoExperiencePagePay(userId?: string | null): {
  order: AlipayOrderRow;
  paymentHtml: string;
} {
  const order = createAlipayOrder({
    subject: DEMO_PAY_SUBJECT,
    totalAmount: DEMO_PAY_AMOUNT,
    userId,
  });
  const paymentHtml = buildPagePayHtml(order);
  return { order, paymentHtml };
}

export function isValidDemoPayAmount(amount: string | undefined): boolean {
  if (amount === undefined) return true;
  return amount === DEMO_PAY_AMOUNT;
}
