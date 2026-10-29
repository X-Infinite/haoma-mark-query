export type PlanId = "free" | "basic" | "pro";
export type BillingPeriod = "monthly" | "yearly";

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    monthlyQuota: number;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
  }
> = {
  free: {
    id: "free",
    name: "免费版",
    monthlyQuota: 1,
    priceMonthly: 0,
    priceYearly: 0,
    features: ["每月 1 次多平台查询", "查看官方申诉指引", "查询历史保留 30 天"],
  },
  basic: {
    id: "basic",
    name: "基础版",
    monthlyQuota: 15,
    priceMonthly: 18,
    priceYearly: 148,
    features: [
      "每月 15 次多平台查询",
      "完整标记详情与申诉链接",
      "邮件提醒（即将上线）",
    ],
  },
  pro: {
    id: "pro",
    name: "专业版",
    monthlyQuota: 50,
    priceMonthly: 38,
    priceYearly: 298,
    features: [
      "每月 50 次多平台查询",
      "优先处理队列",
      "历史记录长期保留",
    ],
  },
};

export const APPEAL_LINKS = {
  tencent: {
    name: "腾讯手机管家",
    url: "https://yun.m.qq.com/shouguan/audit/",
  },
  qihoo360: {
    name: "360 手机卫士",
    url: "http://haomashensu.360.cn/",
  },
  dianhua: {
    name: "电话邦",
    url: "https://www.dianhua.cn/appeal/",
  },
} as const;

export function currentPeriodKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function planQuota(planId: PlanId): number {
  return PLANS[planId].monthlyQuota;
}
