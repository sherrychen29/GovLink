import { cx } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}

/** Skeleton placeholder shaped like a report card, used while hydrating. */
export function ReportCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-5 flex items-center gap-2">
        <Skeleton className="h-3.5 w-40" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <ReportCardSkeleton key={i} />
      ))}
    </div>
  );
}
