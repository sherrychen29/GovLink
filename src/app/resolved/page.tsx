"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { ResolvedFilterPanel } from "@/components/ResolvedFilterPanel";
import { CategoryChip } from "@/components/Chips";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useReports } from "@/lib/store";
import {
  DEFAULT_RESOLVED_FILTERS,
  filterResolvedReports,
  type ResolvedFilters,
} from "@/lib/resolved-filters";
import { type Report, corroborations } from "@/lib/types";
import { formatDate, cx } from "@/lib/utils";
import { CITY } from "@/lib/seed";

const PAGE_SIZE = 14;

export default function ResolvedPage() {
  const { reports, hydrated } = useReports();
  const [filters, setFilters] = useState<ResolvedFilters>({ ...DEFAULT_RESOLVED_FILTERS });
  const [page, setPage] = useState(1);

  const resolved = useMemo(
    () => filterResolvedReports(reports, filters),
    [reports, filters]
  );

  const totalPages = Math.max(1, Math.ceil(resolved.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const safePage = Math.min(page, totalPages);
  const pageReports = useMemo(
    () => resolved.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [resolved, safePage]
  );

  const fixedCount = reports.filter(
    (r) => r.status === "resolved" && !r.resolution?.rejected
  ).length;

  return (
    <SiteShell>
      {/* Header band */}
      <section className="relative overflow-hidden border-b border-navy-100">
        <div className="relative h-[50vh] min-h-[200px] w-full">
          <Image
            src="/images/publicworks-hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover object-[72%_center]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-900/90 to-navy-900/25"
          />
          <div className="absolute inset-0 flex items-center">
            <div className="gl-container py-6 lg:py-8">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                What {CITY.name} has fixed
              </h1>
              <p className="mt-3 max-w-2xl text-white">
                Every issue the city closes out shows up here. {fixedCount} issue
                {fixedCount === 1 ? "" : "s"} resolved and counting — see your
                neighborhood get better, in the open.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="gl-container py-8 lg:py-10">
        <div className="mb-6">
          <ResolvedFilterPanel filters={filters} onChange={setFilters} />
        </div>

        {!hydrated ? (
          <ListSkeleton rows={4} />
        ) : resolved.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Nothing here yet"
            description="No resolved issues match this filter. Try a different category or outcome."
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {pageReports.map((r) => (
                <ResolvedCard key={r.id} report={r} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </SiteShell>
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

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      <PageButton
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        ariaLabel="Previous page"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </PageButton>
      {pages.map((p) => (
        <PageButton
          key={p}
          onClick={() => onChange(p)}
          active={p === page}
          ariaLabel={`Page ${p}`}
        >
          {p}
        </PageButton>
      ))}
      <PageButton
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        ariaLabel="Next page"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </PageButton>
    </nav>
  );
}

function PageButton({
  children,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={cx(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-accent-500 bg-accent-500 text-white"
          : "border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
        disabled && "cursor-not-allowed opacity-40 hover:bg-white"
      )}
    >
      {children}
    </button>
  );
}
