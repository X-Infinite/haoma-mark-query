import { PhoneQueryForm } from "@/components/phone-query-form";

export default function QueryPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">号码标记查询</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          输入待查中国大陆手机号，系统将异步向多平台发起查询。正式环境通常需 1–30
          分钟；当前演示模式会在数秒内返回模拟结果。
        </p>
      </div>

      <PhoneQueryForm variant="default" requireAuthOnMount />
    </div>
  );
}
