import { ButtonLink } from "@/components/button-link";
import { PlanCards } from "@/components/plan-cards";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, Search, ExternalLink } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="space-y-6 text-center">
        <p className="text-sm font-medium text-primary">中国大陆手机号 · 多平台聚合</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          查清号码被谁标记了，按官方路径去申诉
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          一次查询覆盖腾讯手机管家、360 手机卫士、电话邦等常见来源的标记信息。
          我们仅展示查询结果并提供各平台官方申诉链接，不会也无法替您取消标记。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ButtonLink size="lg" href="/query">
            立即查询
          </ButtonLink>
          <ButtonLink size="lg" variant="outline" href="/pricing">
            查看套餐
          </ButtonLink>
        </div>
      </section>

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertTitle>合规说明</AlertTitle>
        <AlertDescription>
          本产品为信息查询与指引工具，不是各标记平台的官方服务。标记解除需您本人前往对应平台申诉并等待审核。
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Search,
            title: "异步多平台查询",
            desc: "提交后 1–30 分钟内返回各平台标记摘要（演示环境约数秒）。",
          },
          {
            icon: ExternalLink,
            title: "官方申诉链接",
            desc: "结果页直达腾讯、360、电话邦等官方申诉入口。",
          },
          {
            icon: ShieldCheck,
            title: "透明套餐配额",
            desc: "按自然月计数，用完需等待下月或升级，无额外加油包。",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border p-5">
            <Icon className="mb-3 size-5 text-primary" />
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">订阅方案</h2>
        <PlanCards />
      </section>
    </div>
  );
}
