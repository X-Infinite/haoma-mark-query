import {
  findJobByExternalId,
  getResultsForJob,
  insertQueryResults,
  updateJobStatus,
} from "../db";
import type { JumdataCallbackPayload } from "./types";

export function applyJumdataCallback(payload: JumdataCallbackPayload) {
  const job = findJobByExternalId(payload.jobId);
  if (!job) {
    return { ok: false as const, error: "unknown_job" };
  }

  if (job.status === "completed") {
    return { ok: true as const, duplicate: true, jobId: job.id };
  }

  updateJobStatus(job.id, "processing");

  if (payload.status === "failed") {
    updateJobStatus(job.id, "failed", payload.errorMessage ?? "查询失败");
    return { ok: true as const, jobId: job.id };
  }

  const existing = getResultsForJob(job.id);
  if (existing.length === 0 && payload.results?.length) {
    insertQueryResults(
      job.id,
      payload.results.map((r) => ({
        platform: r.platformName,
        platform_key: r.platformKey,
        is_marked: r.isMarked ? 1 : 0,
        mark_type: r.markType ?? null,
        mark_label: r.markLabel ?? null,
        appeal_url: r.appealUrl,
        raw_json: JSON.stringify(r),
      })),
    );
  }

  updateJobStatus(job.id, "completed");
  return { ok: true as const, jobId: job.id };
}
