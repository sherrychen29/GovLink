import Link from "next/link";
import { MapPin, Users, ChevronRight } from "lucide-react";
import type { Report } from "@/lib/types";
import { corroborations } from "@/lib/types";
import { CategoryChip } from "./Chips";
import { StatusPill } from "./StatusPill";
import { timeAgo } from "@/lib/utils";

export function ReportListCard({
  report,
  href,
}: {
  report: Report;
  href?: string;
}) {
  const count = corroborations(report);
  const locationText =
    report.location.address ||
    report.location.crossStreet ||
    `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`;

  const content = (
    <article className="card flex items-start gap-4 p-5 transition-shadow hover:shadow-card-hover">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryChip category={report.category} size="sm" />
          <StatusPill
            status={report.status}
            rejected={!!report.resolution?.rejected}
            size="sm"
          />
          {count >= 2 && (
            <span className="chip bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700 ring-1 ring-accent-200">
              <Users className="h-3 w-3" aria-hidden="true" />
              {count}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink">
          {report.description}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1 truncate font-medium text-navy-700">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">{locationText}</span>
          </span>
          <span aria-hidden="true" className="text-ink-muted">·</span>
          <span className="font-mono font-semibold text-navy-700">{report.id}</span>
          <span aria-hidden="true" className="text-ink-muted">·</span>
          <span className="text-ink-muted">{timeAgo(report.createdAt)}</span>
        </div>
      </div>
      {href && (
        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-navy-300"
          aria-hidden="true"
        />
      )}
    </article>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        {content}
      </Link>
    );
  }
  return content;
}
