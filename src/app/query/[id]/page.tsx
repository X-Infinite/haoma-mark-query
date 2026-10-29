import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryDetailClient } from "./query-detail-client";

export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

function DetailFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default async function QueryDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailFallback />}>
      <QueryDetailClient id={id} />
    </Suspense>
  );
}
