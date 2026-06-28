"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  List,
  CircleCheck,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BarChart3,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteShell";
import { GovAccountMenu } from "@/components/GovAccountMenu";
import { FilterPanel } from "@/components/gov/FilterPanel";
import { IssueTable } from "@/components/gov/IssueTable";
import { FormalReportModal } from "@/components/gov/FormalReportModal";
import { EmptyState } from "@/components/EmptyState";
import {
  DEFAULT_FILTERS,
  filterReports,
  sortReports,

  type GovFilters,
  type SortKey,
} from "@/lib/filters";
import { useCurrentUser, useReports } from "@/lib/store";
import { SEVERITY_LEGEND } from "@/lib/meta";
import { cx } from "@/lib/utils";

const PAGE_SIZE = 20;

const ReportMap = dynamic(() => import("@/components/map/ReportMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#e8eef6]">
      <Loader2 className="h-6 w-6 animate-spin text-navy-400" aria-hidden="true" />
    </div>
  ),
});

const AnalyticsPanel = dynamic(
  () => import("@/components/gov/AnalyticsPanel").then((m) => m.AnalyticsPanel),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-navy-400" aria-hidden="true" />
      </div>
    ),
  }
);

export default function GovDashboardPage() {
  return (
    <Suspense fallback={null}>
      <GovDashboard />
    </Suspense>
  );
}

function GovDashboard() {
  const router = useRouter();
  const { user, hydrated } = useCurrentUser();
  const { reports } = useReports();

  const searchParams = useSearchParams();
  const validViews = ["map", "list", "resolved", "analytics"] as const;
  type ViewKey = typeof validViews[number];
  const paramView = searchParams.get("view") as ViewKey | null;
  const [view, setViewState] = useState<ViewKey>(
    validViews.includes(paramView as ViewKey) ? (paramView as ViewKey) : "list"
  );

  function setView(v: ViewKey) {
    setViewState(v);
    const params = new URLSearchParams(window.location.search);
    params.set("view", v);
    router.replace(`/gov?${params.toString()}`, { scroll: false });
  }
  const [filters, setFilters] = useState<GovFilters>({ ...DEFAULT_FILTERS });
  const [sort, setSort] = useState<SortKey>("reports");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Auth gate.
  useEffect(() => {
    if (hydrated && (!user || user.role !== "government")) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  const openPool = useMemo(
    () => reports.filter((r) => r.status !== "resolved"),
    [reports]
  );

  const pool = useMemo(
    () => (view === "resolved" ? reports.filter((r) => r.status === "resolved") : openPool),
    [reports, view, openPool]
  );

  const visible = useMemo(
    () => sortReports(filterReports(pool, filters), sort),
    [pool, filters, sort]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [view, filters, sort]);

  const safePage = Math.min(page, totalPages);
  const pageReports = useMemo(
    () => visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [visible, safePage]
  );

  const mapReports = useMemo(() => {
    const filtered = filterReports(openPool, filters);
    if (selectedId && !filtered.some((r) => r.id === selectedId)) {
      const pinned = reports.find((r) => r.id === selectedId);
      if (pinned) return [...filtered, pinned];
    }
    return filtered;
  }, [openPool, filters, selectedId, reports]);

  const modalReport = modalId ? reports.find((r) => r.id === modalId) ?? null : null;

  function selectReport(id: string) {
    setSelectedId(id);
    setModalId(id);
  }

  function showOnMap(id: string) {
    setSelectedId(id);
    setModalId(null);
    setView("map");
  }
  if (!hydrated || !user || user.role !== "government") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-ink-muted">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <p className="text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-accent-50">
      {/* Header — matches citizen nav exactly */}
      <header className="z-30 shrink-0 bg-navy-900 shadow-md shadow-navy-950/20">
        <div className="gl-container flex h-16 items-center justify-between gap-4">
        {/* Logo — gov home */}
        <Link href="/gov" className="flex flex-col gap-0.5">
          <Logo markClassName="h-8 w-auto brightness-0 invert" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-200/90 sm:text-xs">
            CITY OF SAN JOSE
          </span>
        </Link>

        {/* Nav tabs — same style as citizen header */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Gov views">
          {(
            [
              { key: "map", icon: <MapIcon className="h-4 w-4" aria-hidden="true" />, label: "Map View" },
              { key: "list", icon: <List className="h-4 w-4" aria-hidden="true" />, label: "Issues" },
              { key: "analytics", icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />, label: "Analytics" },
              { key: "resolved", icon: <CircleCheck className="h-4 w-4" aria-hidden="true" />, label: "Resolved" },
            ] as const
          ).map(({ key, icon, label }) => {
            const active = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={active}
                className={cx(
                  "relative flex items-center gap-1.5 rounded-md px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400",
                  active ? "text-white" : "text-navy-200 hover:text-white"
                )}
              >
                {icon}
                {label}
                {active && (
                  <span aria-hidden="true" className="absolute inset-x-3 bottom-1 h-[3px] rounded-full bg-accent-400" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <GovAccountMenu />
          <Link
            href="/"
            className="btn border-2 border-white bg-white/10 font-semibold text-white hover:bg-white hover:text-navy-900"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Public Site</span>
          </Link>
        </div>
        </div>
        <div className="border-t border-navy-800 bg-navy-950">
          <p className="gl-container py-1.5 text-[11px] text-navy-400 sm:text-xs">
            San Jose City Operations · Staff portal
          </p>
        </div>
      </header>

      {/* Controls bar: filters (left) + sort + view toggle (right) */}
      <div className="z-20 shrink-0 border-b border-navy-100 bg-white">
        <div className="gl-container py-3">
          {view !== "analytics" && (
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              showStatusFilter={view !== "resolved"}
              showSort={view === "list" || view === "resolved"}
              sort={sort}
              onSortChange={setSort}
            />
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="relative min-h-0 flex-1">
        {view === "analytics" ? (
          <AnalyticsPanel reports={reports} />
        ) : visible.length === 0 ? (
          <div className="grid h-full place-items-center p-6">
            <EmptyState
              icon={view === "resolved" ? <CircleCheck className="h-6 w-6" /> : <Inbox className="h-6 w-6" />}
              title={
                view === "resolved"
                  ? "No resolved reports match your filters"
                  : "No reports match your filters"
              }
              description="Try widening the severity range or clearing a filter."
              action={
                <button
                  type="button"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                  className="btn-primary"
                >
                  Clear filters
                </button>
              }
            />
          </div>
        ) : view === "map" ? (
          <div className="flex h-full flex-col">
            <div className="relative flex-1">
              <div className="absolute inset-0">
                <ReportMap
                  reports={mapReports}
                  selectedId={selectedId}
                  onSelect={selectReport}
                />
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-navy-100 bg-white/95 p-4 shadow-card">
                <p className="mb-2 text-sm font-bold text-navy-900">
                  Severity ({mapReports.length} shown)
                </p>
                <div className="flex flex-col gap-1.5">
                  {SEVERITY_LEGEND.map((x) => (
                    <span key={x.label} className="flex items-center gap-2.5 text-sm font-medium text-ink-soft">
                      <span
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: x.hex }}
                      />
                      {x.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <SiteFooter compact />
          </div>
        ) : view === "resolved" || view === "list" ? (
          <div className="h-full overflow-y-auto">
          <div className="gl-container py-4 sm:py-6">
            <p className="mb-3 text-sm text-ink-muted">
              {visible.length} report{visible.length === 1 ? "" : "s"} displayed
            </p>
            <IssueTable
              reports={pageReports}
              selectedId={selectedId}
              onSelect={selectReport}
              sort={sort}
              onSortChange={setSort}
              showStatus={view === "list"}
            />
            {totalPages > 1 && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
              />
            )}
          </div>
          <SiteFooter compact />
          </div>
        ) : null}
      </main>

      {/* Center modal */}
      {modalReport && (
        <FormalReportModal
          report={modalReport}
          authorName={user.displayName}
          onClose={() => setModalId(null)}
          onShowOnMap={() => showOnMap(modalReport.id)}
        />
      )}
    </div>
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
      className="mt-5 flex items-center justify-center gap-4"
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
