import { NextResponse } from "next/server";
import { applyJumdataCallback } from "@/lib/jumdata/process-callback";
import type { JumdataCallbackPayload } from "@/lib/jumdata/types";
import { z } from "zod";

const resultSchema = z.object({
  platformKey: z.string(),
  platformName: z.string(),
  isMarked: z.boolean(),
  markType: z.string().optional(),
  markLabel: z.string().optional(),
  appealUrl: z.string(),
});

const payloadSchema = z.object({
  jobId: z.string(),
  status: z.enum(["success", "failed"]),
  phoneNumber: z.string(),
  results: z.array(resultSchema).optional(),
  errorMessage: z.string().optional(),
  timestamp: z.string(),
});

function verifySignature(request: Request): boolean {
  const expected =
    process.env.JUMDATA_WEBHOOK_SECRET ?? "mock-webhook-secret";
  const sig = request.headers.get("X-Jumdata-Signature");
  return sig === expected;
}

export async function POST(request: Request) {
  if (!verifySignature(request)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const result = applyJumdataCallback(parsed.data as JumdataCallbackPayload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json(result);
}
