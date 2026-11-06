/**
 * 支付宝电脑网站支付（alipay.trade.page.pay）环境变量：
 * - ALIPAY_APP_ID
 * - ALIPAY_PRIVATE_KEY（应用私钥 PEM，可用 \\n 表示换行）
 * - ALIPAY_PUBLIC_KEY（支付宝公钥 PEM）
 * - ALIPAY_GATEWAY（可选，默认沙箱 openapi.alipaydev.com 或正式 openapi.alipay.com）
 * - ALIPAY_SANDBOX=true 时使用沙箱网关（未设置 ALIPAY_GATEWAY 时）
 * - NEXT_PUBLIC_APP_URL 或 CALLBACK_BASE_URL：拼接 notify_url / return_url
 */

function normalizePem(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/\\n/g, "\n").trim();
}

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.CALLBACK_BASE_URL ??
    "http://127.0.0.1:43123";
  return raw.replace(/\/$/, "");
}

export function getAlipayGateway(): string {
  if (process.env.ALIPAY_GATEWAY) {
    return process.env.ALIPAY_GATEWAY.replace(/\/$/, "");
  }
  if (process.env.ALIPAY_SANDBOX === "true") {
    return "https://openapi.alipaydev.com/gateway.do";
  }
  return "https://openapi.alipay.com/gateway.do";
}

export function isAlipayConfigured(): boolean {
  return !!(
    process.env.ALIPAY_APP_ID &&
    normalizePem(process.env.ALIPAY_PRIVATE_KEY) &&
    normalizePem(process.env.ALIPAY_PUBLIC_KEY)
  );
}

export function getAlipaySdkOptions() {
  return {
    appId: process.env.ALIPAY_APP_ID ?? "",
    privateKey: normalizePem(process.env.ALIPAY_PRIVATE_KEY),
    alipayPublicKey: normalizePem(process.env.ALIPAY_PUBLIC_KEY),
    gateway: getAlipayGateway(),
    ...(process.env.ALIPAY_KEY_TYPE === "PKCS8"
      ? { keyType: "PKCS8" as const }
      : {}),
  };
}
