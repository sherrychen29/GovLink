"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  Sparkle,
  Inbox,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { CategoryChip } from "@/components/Chips";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useReports } from "@/lib/store";
import { CATEGORIES, type Category, type Report, corroborations } from "@/lib/types";
import { formatDate, cx } from "@/lib/utils";
import { CITY } from "@/lib/seed";

export default function ResolvedPage() {
  const { reports, hydrated } = useReports();
  const [category, setCategory] = useState<Category | "all">("all");
  const [showDeclined, setShowDeclined] = useState(true);

  const resolved = useMemo(() => {
    return reports
      .filter((r) => r.status === "resolved" && r.resolution)
      .filter((r) => showDeclined || !r.resolution?.rejected)
      .filter((r) => category === "all" || r.category === category)
      .sort(
        (a, b) =>
          new Date(b.resolution!.resolvedAt).getTime() -
          new Date(a.resolution!.resolvedAt).getTime()
      );
  }, [reports, category, showDeclined]);

  const fixedCount = reports.filter(
    (r) => r.status === "resolved" && !r.resolution?.rejected
  ).length;

  return (
    <SiteShell>
      {/* Header band */}
      <section className="border-b border-navy-100 bg-navy-900 text-white">
        <div className="gl-container py-12 lg:py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent-200">
            <Sparkle className="h-3.5 w-3.5" aria-hidden="true" />
            Transparency feed
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            What {CITY.name} has fixed
          </h1>
          <p className="mt-3 max-w-2xl text-navy-200">
            Every issue the city closes out shows up here. {fixedCount} issue
            {fixedCount === 1 ? "" : "s"} resolved and counting — see your
            neighborhood get better, in the open.
          </p>
        </div>
      </section>

      <div className="gl-container py-8 lg:py-10">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by category"
          >
            <FilterChip
              active={category === "all"}
              onClick={() => setCategory("all")}
            >
              All
            </FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </FilterChip>
            ))}
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-navy-300 text-accent-600 focus:ring-accent-400"
              checked={showDeclined}
              onChange={(e) => setShowDeclined(e.target.checked)}
            />
            Show declined requests
          </label>
        </div>

        {!hydrated ? (
          <ListSkeleton rows={4} />
        ) : resolved.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Nothing here yet"
            description="No resolved issues match this filter. Try a different category."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resolved.map((r) => (
              <ResolvedCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-navy-900 text-white"
          : "border border-navy-200 bg-white text-ink-soft hover:border-navy-300 hover:text-navy-900"
      )}
    >
      {children}
    </button>
  );
}

function ResolvedCard({ report }: { report: Report }) {
  const rejected = !!report.resolution?.rejected;
  const count = corroborations(report);
  const locationText =
    report.location.address ||
    report.location.crossStreet ||
    `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`;

  return (
    <article className="card flex flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <CategoryChip category={report.category} size="sm" />
        <span
          className={cx(
            "chip px-2 py-0.5 text-[11px] font-semibold",
            rejected
              ? "bg-red-50 text-red-700 ring-1 ring-red-200"
              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          )}
        >
          {rejected ? (
            <XCircle className="h-3 w-3" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          )}
          {rejected ? "Declined" : "Fixed"}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm font-medium text-navy-900">
        {report.description}
      </p>

      <div
        className={cx(
          "mt-3 rounded-lg p-3 text-xs leading-relaxed",
          rejected ? "bg-red-50/60 text-red-800" : "bg-emerald-50/60 text-emerald-800"
        )}
      >
        <span className="font-semibold">
          {rejected ? "City response: " : "Resolution: "}
        </span>
        {report.resolution!.note}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1 truncate">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="truncate">{locationText}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>Resolved {formatDate(report.resolution!.resolvedAt)}</span>
        {count >= 2 && (
          <>
            <span aria-hidden="true">·</span>
            <span>{count} residents reported</span>
          </>
        )}
      </div>
    </article>
  );
}
