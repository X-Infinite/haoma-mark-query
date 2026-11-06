import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export type AlipayRuntimeConfig = {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gateway: string;
  signType: "RSA2";
  sellerId: string;
  sellerEmail: string | null;
  notifyUrl: string | null;
  returnUrl: string;
  mode: "sandbox" | "production";
};

type SandboxApp = {
  appId: string;
  appPrivateKey?: string;
  appPrivatePkcsKey?: string;
  alipayPublicKey?: string;
  pid?: string;
  type?: string;
};

type SandboxFile = {
  appIds?: SandboxApp[];
  sandboxAccounts?: {
    partner?: { merchantId?: string | null; email?: string | null; userId?: string | null };
  };
};

const SANDBOX_GATEWAY = "https://openapi-sandbox.dl.alipaydev.com/gateway.do";
const PRODUCTION_GATEWAY = "https://openapi.alipay.com/gateway.do";

function walkToProjectRoot(startDir: string): string | null {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const pkg = path.join(dir, "package.json");
    const sandbox = path.join(dir, ".alipay-sandbox.json");
    if (fs.existsSync(pkg) && fs.existsSync(sandbox)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Locate project root without process.cwd / launch-directory dependency. */
export function resolveAlipayProjectRoot(): string {
  if (process.env.ALIPAY_PROJECT_ROOT) {
    const root = path.resolve(process.env.ALIPAY_PROJECT_ROOT);
    if (!fs.existsSync(path.join(root, ".alipay-sandbox.json"))) {
      throw new Error("ALIPAY_PROJECT_ROOT 下缺少 .alipay-sandbox.json");
    }
    return root;
  }
  let here: string;
  try {
    here = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    throw new Error(
      "无法定位项目根：请设置 ALIPAY_PROJECT_ROOT 为包含 .alipay-sandbox.json 的绝对路径",
    );
  }
  const fromModule = walkToProjectRoot(here);
  if (fromModule) return fromModule;
  throw new Error(
    "无法从模块路径定位 .alipay-sandbox.json：请设置 ALIPAY_PROJECT_ROOT",
  );
}

function readSandboxFile(projectRoot: string): SandboxFile {
  const configPath = path.join(projectRoot, ".alipay-sandbox.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("沙箱配置文件不存在：.alipay-sandbox.json");
  }
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw) as SandboxFile;
}

function pickSandboxApp(file: SandboxFile): SandboxApp {
  const apps = file.appIds ?? [];
  if (apps.length === 0) {
    throw new Error("沙箱配置缺少 appIds");
  }
  return apps[0];
}

function appBaseUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://127.0.0.1:43123";
}

let cached: AlipayRuntimeConfig | null = null;

/**
 * Load Alipay runtime config.
 * Sandbox: read verified .alipay-sandbox.json from project root.
 * Production: use ALIPAY_* env vars (never mix with sandbox).
 * Node.js must use PKCS#1 private key (appPrivatePkcsKey).
 */
export function getAlipayRuntimeConfig(): AlipayRuntimeConfig {
  if (cached) return cached;

  const mode =
    process.env.ALIPAY_MODE === "production" ? "production" : "sandbox";

  if (mode === "production") {
    const appId = (process.env.ALIPAY_APP_ID || "").trim();
    const privateKey = (process.env.ALIPAY_PRIVATE_KEY || "").trim();
    const alipayPublicKey = (process.env.ALIPAY_PUBLIC_KEY || "").trim();
    const sellerId = (process.env.ALIPAY_SELLER_ID || "").trim();
    if (!appId || !privateKey || !alipayPublicKey || !sellerId) {
      throw new Error("生产支付配置不完整");
    }
    const notifyUrl = (process.env.ALIPAY_NOTIFY_URL || "").trim() || null;
    cached = {
      appId,
      privateKey,
      alipayPublicKey,
      gateway: (process.env.ALIPAY_GATEWAY || "").trim() || PRODUCTION_GATEWAY,
      signType: "RSA2",
      sellerId,
      sellerEmail: (process.env.ALIPAY_SELLER_EMAIL || "").trim() || null,
      notifyUrl,
      returnUrl: `${appBaseUrl()}/alipay/return`,
      mode,
    };
    return cached;
  }

  const projectRoot = resolveAlipayProjectRoot();
  const file = readSandboxFile(projectRoot);
  const app = pickSandboxApp(file);
  const privateKey = (app.appPrivatePkcsKey || "").trim();
  const alipayPublicKey = (app.alipayPublicKey || "").trim();
  if (!app.appId || !privateKey || !alipayPublicKey) {
    throw new Error("沙箱应用密钥字段不完整");
  }

  const sellerId =
    (app.pid || "").trim() ||
    (file.sandboxAccounts?.partner?.merchantId || "").trim() ||
    (file.sandboxAccounts?.partner?.userId || "").trim();
  if (!sellerId) {
    throw new Error("沙箱配置缺少 sellerId/pid");
  }

  const notifyCandidate = (process.env.ALIPAY_NOTIFY_URL || "").trim();
  const notifyUrl =
    notifyCandidate.startsWith("https://") ? notifyCandidate : null;

  cached = {
    appId: app.appId,
    privateKey,
    alipayPublicKey,
    gateway: SANDBOX_GATEWAY,
    signType: "RSA2",
    sellerId,
    sellerEmail: (file.sandboxAccounts?.partner?.email || "").trim() || null,
    notifyUrl,
    returnUrl: `${appBaseUrl()}/alipay/return`,
    mode,
  };
  return cached;
}

export function clearAlipayConfigCache() {
  cached = null;
}
