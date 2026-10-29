import type {
  JumdataProvider,
  SubmitQueryResponse,
} from "./types";

/**
 * 聚美智数（Jumdata）真实 API 占位实现。
 * 接入时请参照官方文档填写请求签名、异步任务 ID 与回调验签逻辑。
 */
export class LiveJumdataProvider implements JumdataProvider {
  private appId: string;
  private appSecret: string;
  private callbackBase: string;

  constructor() {
    const appId = process.env.JUMDATA_APP_ID;
    const appSecret = process.env.JUMDATA_APP_SECRET;
    const callbackBase = process.env.CALLBACK_BASE_URL;

    if (!appId || !appSecret || !callbackBase) {
      throw new Error(
        "Live Jumdata 模式需要 JUMDATA_APP_ID、JUMDATA_APP_SECRET、CALLBACK_BASE_URL",
      );
    }

    this.appId = appId;
    this.appSecret = appSecret;
    this.callbackBase = callbackBase;
  }

  async submitMultiPlatformQuery(
    phoneNumber: string,
  ): Promise<SubmitQueryResponse> {
    const apiUrl =
      process.env.JUMDATA_API_URL ??
      "https://api.jumdata.com/v1/phone/mark/async";

    const callbackUrl = `${this.callbackBase.replace(/\/$/, "")}/api/webhooks/jumdata`;

    const body = {
      app_id: this.appId,
      phone: phoneNumber,
      callback_url: callbackUrl,
      platforms: ["tencent", "360", "dianhua"],
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.appSecret}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Jumdata API 错误: ${response.status} ${text}`);
    }

    const data = (await response.json()) as { job_id?: string; jobId?: string };
    const externalJobId = data.job_id ?? data.jobId;
    if (!externalJobId) {
      throw new Error("Jumdata API 未返回 job_id");
    }

    return { externalJobId };
  }
}
