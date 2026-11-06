import { handleAlipayNotify } from "@/lib/alipay/service";

export async function POST(request: Request) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });

  const result = await handleAlipayNotify(params);
  return new Response(result, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
