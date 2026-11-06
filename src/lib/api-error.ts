import { NextResponse } from "next/server";

/** Map uncaught handler errors (e.g. DB open) to a JSON 500 body. */
export function jsonServerError(
  error: unknown,
  fallback = "服务暂不可用",
): NextResponse {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
