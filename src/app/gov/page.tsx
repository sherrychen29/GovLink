"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  List,
  LogOut,
  CircleCheck,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { FilterPanel } from "@/components/gov/FilterPanel";
import { IssueTable } from "@/components/gov/IssueTable";
import { FormalReportModal } from "@/components/gov/FormalReportModal";
import { EmptyState } from "@/components/EmptyState";
import {
  DEFAULT_FILTERS,
  filterReports,
  sortReports,
  SORT_LABELS,
  type GovFilters,
  type SortKey,
} from "@/lib/filters";
import { logout, useCurrentUser, useReports } from "@/lib/store";
import { SEVERITY_LEGEND } from "@/lib/meta";
import { cx } from "@/lib/utils";

const PAGE_SIZE = 15;

const ReportMap = dynamic(() => import("@/components/map/ReportMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#e8eef6]">
      <Loader2 className="h-6 w-6 animate-spin text-navy-400" aria-hidden="true" />
    </div>
  ),
});

export default function GovDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated } = useCurrentUser();
  const { reports } = useReports();

  const [view, setView] = useState<"map" | "list" | "resolved">("list");
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
  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status !== "resolved");
    return {
      open: open.length,
      critical: open.filter((r) => r.severity >= 8).length,
      resolved: reports.filter((r) => r.status === "resolved").length,
    };
  }, [reports]);

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
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Header — matches citizen nav exactly */}
      <header className="z-30 shrink-0 bg-navy-900 shadow-md shadow-navy-950/20">
        <div className="gl-container flex h-16 items-center justify-between gap-4">
        {/* Logo — same layout as citizen nav */}
        <Link href="/" className="flex flex-col gap-0.5">
          <Logo markClassName="h-8 w-auto brightness-0 invert" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-200/90 sm:text-xs">
            CITY OF SAN JOSE
          </span>
        </Link>

        {/* Nav links — no icons, same style as citizen nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          {[
            { href: "/gov", label: "Dashboard" },
            { href: "/", label: "Public Site" },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative rounded-md px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                  active ? "text-white" : "text-navy-200 hover:text-white"
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-1 h-[3px] rounded-full bg-accent-400"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign out — same border-2 white outline style as citizen nav buttons */}
        <button
          type="button"
          onClick={() => { logout(); router.push("/"); }}
          className="btn border-2 border-white bg-white/10 font-semibold text-white hover:bg-white hover:text-navy-900"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
        </div>
        <div className="border-t border-navy-800 bg-navy-950">
          <p className="gl-container py-1.5 text-[11px] text-navy-400 sm:text-xs">
            San Jose City Operations · Staff portal
          </p>
        </div>
      </header>

      {/* Stats + view toggle */}
      <div className="z-20 shrink-0 border-b border-navy-100 bg-white">
      <div className="gl-container flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {stats.open} reports · {stats.critical} critical · {stats.resolved} resolved
        </p>

        <div className="flex items-center justify-end gap-2">
          {(view === "list" || view === "resolved") && (
            <div className="hidden items-center gap-2 sm:flex">
              <label htmlFor="sort" className="text-xs font-medium text-ink-muted">
                Sort
              </label>
              <select
                id="sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-navy-200 bg-white px-2.5 py-1.5 text-sm focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/40"
              >
                <option value="reports"># of reports</option>
                <option value="severity">Severity</option>
                <option value="date">Date submitted</option>
                <option value="category">Category</option>
                {view === "list" && <option value="status">Status</option>}
              </select>
            </div>
          )}
          <div className="inline-flex rounded-lg border border-navy-200 bg-navy-50 p-1">
            <ViewToggle
              active={view === "map"}
              onClick={() => setView("map")}
              icon={<MapIcon className="h-4 w-4" />}
              label="Map"
            />
            <ViewToggle
              active={view === "list"}
              onClick={() => setView("list")}
              icon={<List className="h-4 w-4" />}
              label="List"
            />
            <ViewToggle
              active={view === "resolved"}
              onClick={() => setView("resolved")}
              icon={<CircleCheck className="h-4 w-4" />}
              label="Resolved"
            />
          </div>
        </div>
      </div>
      </div>

      {/* Filters — collapsible top bar */}
      <div className="z-10 shrink-0 border-b border-navy-100 bg-white">
      <div className="gl-container py-3">
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          showStatusFilter={view !== "resolved"}
        />
      </div>
      </div>

      {/* Main content */}
      <main className="relative min-h-0 flex-1">
        {visible.length === 0 ? (
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
          <div className="absolute inset-0">
            <ReportMap
              reports={mapReports}
              selectedId={selectedId}
              onSelect={selectReport}
            />
            <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-navy-100 bg-white/95 p-3 text-xs shadow-card">
              <p className="mb-1.5 font-semibold text-navy-900">
                Severity ({mapReports.length} shown)
              </p>
              <div className="flex flex-col gap-1">
                {SEVERITY_LEGEND.map((x) => (
                  <span key={x.label} className="flex items-center gap-2 text-ink-soft">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: x.hex }}
                    />
                    {x.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : view === "resolved" || view === "list" ? (
          <div className="h-full overflow-y-auto">
          <div className="gl-container py-4 sm:py-6">
            <p className="mb-3 text-sm text-ink-muted">
              {visible.length} report{visible.length === 1 ? "" : "s"} · ranked by{" "}
              {SORT_LABELS[sort]}
              {totalPages > 1 && (
                <>
                  {" · "}showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, visible.length)}
                </>
              )}
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

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-white text-navy-900 shadow-sm" : "text-ink-soft hover:text-navy-900"
      )}
    >
      {icon}
      {label}
    </button>
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
      className="mt-5 flex flex-wrap items-center justify-center gap-1.5"
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
