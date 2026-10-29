import { v4 as uuidv4 } from "uuid";
import type {
  JumdataCallbackPayload,
  JumdataPlatformResult,
  JumdataProvider,
  SubmitQueryResponse,
} from "./types";
import { APPEAL_LINKS } from "../subscription";

function hashSeed(phone: string): number {
  let h = 0;
  for (let i = 0; i < phone.length; i++) {
    h = (h * 31 + phone.charCodeAt(i)) >>> 0;
  }
  return h;
}

function buildMockResults(phoneNumber: string): JumdataPlatformResult[] {
  const seed = hashSeed(phoneNumber);
  const platforms: Array<{
    key: keyof typeof APPEAL_LINKS;
    types: string[];
    labels: string[];
  }> = [
    {
      key: "tencent",
      types: ["骚扰电话", "广告推销", "诈骗风险"],
      labels: ["用户标记", "系统识别"],
    },
    {
      key: "qihoo360",
      types: ["推销", "骚扰", "疑似诈骗"],
      labels: ["多人标记"],
    },
    {
      key: "dianhua",
      types: ["广告", "骚扰", "空号嫌疑"],
      labels: ["平台收录"],
    },
  ];

  return platforms.map((p, idx) => {
    const marked = (seed + idx * 17) % 3 !== 0;
    const link = APPEAL_LINKS[p.key];
    return {
      platformKey: p.key,
      platformName: link.name,
      isMarked: marked,
      markType: marked ? p.types[(seed + idx) % p.types.length] : undefined,
      markLabel: marked ? p.labels[(seed + idx) % p.labels.length] : undefined,
      appealUrl: link.url,
    };
  });
}

async function deliverCallback(payload: JumdataCallbackPayload) {
  const base =
    process.env.CALLBACK_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://127.0.0.1:43123";
  const url = `${base.replace(/\/$/, "")}/api/webhooks/jumdata`;
  const secret = process.env.JUMDATA_WEBHOOK_SECRET ?? "mock-webhook-secret";

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Jumdata-Signature": secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[mock-jumdata] callback failed", err);
  }
}

export class MockJumdataProvider implements JumdataProvider {
  async submitMultiPlatformQuery(
    phoneNumber: string,
  ): Promise<SubmitQueryResponse> {
    const externalJobId = `mock_${uuidv4()}`;
    const delayMs = 4000 + (hashSeed(phoneNumber) % 8000);

    setTimeout(() => {
      const payload: JumdataCallbackPayload = {
        jobId: externalJobId,
        status: "success",
        phoneNumber,
        results: buildMockResults(phoneNumber),
        timestamp: new Date().toISOString(),
      };
      void deliverCallback(payload);
    }, delayMs);

    return { externalJobId };
  }
}
