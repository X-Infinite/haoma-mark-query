import { AlipaySdk } from "alipay-sdk";
import { getAlipaySdkOptions, isAlipayConfigured } from "./config";

let sdk: AlipaySdk | null = null;

export function getAlipayClient(): AlipaySdk {
  if (!isAlipayConfigured()) {
    throw new Error("支付宝未配置：请设置 ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY");
  }
  if (!sdk) {
    sdk = new AlipaySdk(getAlipaySdkOptions());
  }
  return sdk;
}
