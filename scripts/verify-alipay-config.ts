/**
 * Verifies sandbox config: env-first when ALIPAY_* are set, else .alipay-sandbox.json.
 * Run: npm run verify:alipay-config
 */
import fs from "fs";
import os from "os";
import path from "path";
import {
  clearAlipayConfigCache,
  getAlipayRuntimeConfig,
} from "../src/lib/alipay/config";

const SANDBOX_GATEWAY = "https://openapi-sandbox.dl.alipaydev.com/gateway.do";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

function withEnv(
  patch: Record<string, string | undefined>,
  fn: () => void,
): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(patch)) {
    saved[key] = process.env[key];
    const value = patch[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    clearAlipayConfigCache();
  }
}

function testSandboxFromEnv(): void {
  withEnv(
    {
      ALIPAY_MODE: "sandbox",
      ALIPAY_APP_ID: "2021000123456789",
      ALIPAY_PRIVATE_KEY: "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtest",
      ALIPAY_PUBLIC_KEY: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest",
      ALIPAY_SELLER_ID: "2088123456789012",
      ALIPAY_PROJECT_ROOT: undefined,
    },
    () => {
      clearAlipayConfigCache();
      const cfg = getAlipayRuntimeConfig();
      assert(cfg.mode === "sandbox", "mode should be sandbox");
      assert(cfg.appId === "2021000123456789", "appId from env");
      assert(cfg.gateway === SANDBOX_GATEWAY, "sandbox gateway");
      assert(cfg.sellerId === "2088123456789012", "sellerId from env");
    },
  );
  console.log("OK: sandbox credentials from env (no JSON file)");
}

function testSandboxFromJsonFile(): void {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "alipay-sandbox-"));
  const sandboxJson = {
    appIds: [
      {
        appId: "2021000999887766",
        appPrivatePkcsKey: "filePrivateKeyBase64",
        alipayPublicKey: "filePublicKeyBase64",
        pid: "2088998877665544",
      },
    ],
    sandboxAccounts: {
      partner: { email: "sandbox@test.example" },
    },
  };
  fs.writeFileSync(
    path.join(tmpRoot, ".alipay-sandbox.json"),
    JSON.stringify(sandboxJson),
  );

  withEnv(
    {
      ALIPAY_MODE: "sandbox",
      ALIPAY_APP_ID: undefined,
      ALIPAY_PRIVATE_KEY: undefined,
      ALIPAY_PUBLIC_KEY: undefined,
      ALIPAY_SELLER_ID: undefined,
      ALIPAY_PROJECT_ROOT: tmpRoot,
    },
    () => {
      clearAlipayConfigCache();
      const cfg = getAlipayRuntimeConfig();
      assert(cfg.mode === "sandbox", "mode should be sandbox");
      assert(cfg.appId === "2021000999887766", "appId from JSON");
      assert(cfg.privateKey === "filePrivateKeyBase64", "private key from JSON");
      assert(cfg.sellerEmail === "sandbox@test.example", "seller email from JSON");
    },
  );

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log("OK: sandbox credentials from .alipay-sandbox.json fallback");
}

testSandboxFromEnv();
testSandboxFromJsonFile();
console.log("All Alipay config checks passed.");
