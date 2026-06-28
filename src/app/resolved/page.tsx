"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  XCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Users,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { SiteShell } from "@/components/SiteShell";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { CategoryChip } from "@/components/Chips";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/Skeleton";
import { useReports } from "@/lib/store";
import {
  DEFAULT_RESOLVED_FILTERS,
  filterResolvedReports,
  type ResolvedFilters,
  type ResolvedOutcome,
} from "@/lib/resolved-filters";
import { CATEGORIES, type Category, type Report, corroborations } from "@/lib/types";
import { formatDate, cx } from "@/lib/utils";
import { CITY } from "@/lib/seed";

const PAGE_SIZE = 20;
const OUTCOMES = ["fixed", "declined"] as const satisfies readonly ResolvedOutcome[];

export default function ResolvedPage() {
  const { reports, hydrated } = useReports();
  const [filters, setFilters] = useState<ResolvedFilters>({ ...DEFAULT_RESOLVED_FILTERS });
  const [sortOrder, setSortOrder] = useState<"recent" | "old">("recent");
  const [page, setPage] = useState(1);

  const resolved = useMemo(() => {
    const base = filterResolvedReports(reports, filters);
    if (sortOrder === "old") {
      return [...base].reverse();
    }
    return base;
  }, [reports, filters, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(resolved.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const safePage = Math.min(page, totalPages);
  const pageReports = useMemo(
    () => resolved.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [resolved, safePage]
  );

  const toggleCategory = (c: Category) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : [...f.categories, c],
    }));

  const toggleOutcome = (o: ResolvedOutcome) =>
    setFilters((f) => ({
      ...f,
      outcomes: f.outcomes.includes(o)
        ? f.outcomes.filter((x) => x !== o)
        : [...f.outcomes, o],
    }));

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
                Resolved Issues in {CITY.name}
              </h1>
              <p className="mt-3 max-w-2xl text-white">
                Every issue the city closes out shows up here. {resolved.length} issue
                {resolved.length === 1 ? "" : "s"} shown; see your neighborhood
                get better, in the open.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex-1 bg-accent-50">
      <div className="gl-container py-8 lg:py-10">
        {/* Inline filters; right-aligned row */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <p className="text-base font-semibold text-navy-900">
            {resolved.length} result{resolved.length === 1 ? "" : "s"}
            {(filters.categories.length > 0 || filters.outcomes.length > 0) && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setFilters({ ...DEFAULT_RESOLVED_FILTERS })}
                  className="text-navy-700 underline underline-offset-2 hover:text-navy-900"
                >
                  Clear filters
                </button>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-end gap-5">
            {/* Sort */}
            <FilterPills
              label="SORT"
              options={[
                { value: "recent", label: "Recent" },
                { value: "old", label: "Oldest" },
              ]}
              value={sortOrder}
              onChange={(v) => setSortOrder(v as "recent" | "old")}
            />
            {/* Category */}
            <MultiSelectDropdown
              label="CATEGORY"
              summaryAll="All"
              options={CATEGORIES}
              selected={filters.categories}
              onToggle={toggleCategory}
              getLabel={(c) => c}
              className="w-52"
              labelClassName="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy-800"
            />
            {/* Outcome */}
            <FilterPills
              label="OUTCOME"
              options={[
                { value: "all", label: "All" },
                { value: "fixed", label: "Solved" },
                { value: "declined", label: "Cancelled" },
              ]}
              value={
                filters.outcomes.length === 2 || filters.outcomes.length === 0
                  ? "all"
                  : filters.outcomes[0]
              }
              onChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  outcomes:
                    v === "all"
                      ? [...OUTCOMES]
                      : [v as ResolvedOutcome],
                }))
              }
            />
          </div>
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
              <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </div>
      </div>
    </SiteShell>
  );
}

function ResolvedCard({ report }: { report: Report }) {
  const rejected = !!report.resolution?.rejected;
  const count = corroborations(report);

  // If a specific street exists, strip the city suffix to avoid redundancy
  const hasStreet = !!(report.location.address || report.location.crossStreet);
  const rawLocation =
    report.location.address ||
    report.location.crossStreet ||
    `${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}`;
  const locationText = hasStreet
    ? rawLocation.replace(/,\s*San Jose.*$/i, "").replace(/,\s*CA.*$/i, "").trim()
    : rawLocation;

  return (
    <article className="card flex flex-col rounded-xl border-slate-300/70 p-4">
      {/* Top row: category + location/date */}
      <div className="flex items-start justify-between gap-3">
        <CategoryChip category={report.category} variant="label" />
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-navy-600">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="max-w-[160px] truncate">{locationText}</span>
          </span>
          <span className="text-[11px] text-ink-muted">
            Resolved {formatDate(report.resolution!.resolvedAt)}
          </span>
        </div>
      </div>

      {/* Badges */}
      {(count >= 2 || rejected) && (
        <div className="mt-1.5 flex items-center gap-2">
          {count >= 2 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-600">
              <Users className="h-3 w-3" aria-hidden="true" />
              {count} citizens reported
            </span>
          )}
          {rejected && (
            <span className="chip bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200">
              <XCircle className="h-3 w-3" aria-hidden="true" />
              Declined
            </span>
          )}
        </div>
      )}

      <p className="mt-2 line-clamp-2 text-sm font-medium text-navy-900">
        {report.description}
      </p>

      <div
        className={cx(
          "mt-2 flex items-start gap-2 rounded-lg p-2.5 text-xs leading-relaxed",
          rejected ? "bg-cyan-50/60 text-cyan-800" : "bg-emerald-50/60 text-emerald-800"
        )}
      >
        {rejected ? (
          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        )}
        <span>
          <span className="font-semibold">
            {rejected ? "City response: " : "Resolution: "}
          </span>
          {report.resolution!.note}
        </span>
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
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-4"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={cx(
          "inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50",
          page === 1 && "cursor-not-allowed opacity-40 hover:bg-white"
        )}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Prev
      </button>
      <span className="text-sm text-ink-muted">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
        className={cx(
          "inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50",
          page === totalPages && "cursor-not-allowed opacity-40 hover:bg-white"
        )}
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

function FilterPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy-800">
        {label}
      </span>
      <div className="inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-1.5 py-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              value === opt.value
                ? "bg-navy-900 text-white"
                : "text-navy-700 hover:bg-navy-50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
