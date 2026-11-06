/** 将 alipay.trade.page.pay 返回的 HTML 注入页面并自动提交表单 */
export function submitAlipayPaymentHtml(paymentHtml: string) {
  const container = document.createElement("div");
  container.innerHTML = paymentHtml;
  document.body.appendChild(container);
  const form = container.querySelector("form");
  if (!form) {
    container.remove();
    throw new Error("无效的支付表单");
  }
  form.submit();
}
