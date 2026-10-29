import { Badge } from "@/components/ui/badge";
import type { JobStatus } from "@/lib/db";

const labels: Record<JobStatus, string> = {
  pending: "排队中",
  processing: "查询中",
  completed: "已完成",
  failed: "失败",
};

const variants: Record<
  JobStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "default",
  completed: "outline",
  failed: "destructive",
};

export function QueryStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>;
}
