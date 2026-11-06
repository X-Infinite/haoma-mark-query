import { AlipaySdk } from "alipay-sdk";
import { getAlipayRuntimeConfig, type AlipayRuntimeConfig } from "./config";

let sdk: AlipaySdk | null = null;
let sdkAppId: string | null = null;

export function createAlipaySdk(config?: AlipayRuntimeConfig): AlipaySdk {
  const cfg = config ?? getAlipayRuntimeConfig();
  return new AlipaySdk({
    appId: cfg.appId,
    privateKey: cfg.privateKey,
    alipayPublicKey: cfg.alipayPublicKey,
    gateway: cfg.gateway,
    signType: cfg.signType,
  });
}

export function getAlipaySdk(): AlipaySdk {
  const cfg = getAlipayRuntimeConfig();
  if (!sdk || sdkAppId !== cfg.appId) {
    sdk = createAlipaySdk(cfg);
    sdkAppId = cfg.appId;
  }
  return sdk;
}

export function formatAlipayTimestamp(date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function normalizeAmountText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return `${BigInt(match[1]).toString()}.${(match[2] || "").padEnd(2, "0")}`;
}

export function amountEquals(expected: unknown, actual: unknown): boolean {
  const a = normalizeAmountText(expected);
  const b = normalizeAmountText(actual);
  return a !== null && a === b;
}

export type TradeBusinessState =
  | "PAID"
  | "PENDING_PAYMENT"
  | "CLOSED"
  | "UNKNOWN";

export function mapTradeStatus(tradeStatus: string | undefined): TradeBusinessState {
  switch (tradeStatus) {
    case "TRADE_SUCCESS":
    case "TRADE_FINISHED":
      return "PAID";
    case "WAIT_BUYER_PAY":
      return "PENDING_PAYMENT";
    case "TRADE_CLOSED":
      return "CLOSED";
    default:
      return "UNKNOWN";
  }
}
