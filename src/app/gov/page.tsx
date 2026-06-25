"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Map as MapIcon,
  List,
  LogOut,
  ExternalLink,
  SlidersHorizontal,
  X,
  TriangleAlert,
  Inbox,
  Activity,
  CircleCheck,
  Loader2,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { FilterPanel } from "@/components/gov/FilterPanel";
import { IssueTable } from "@/components/gov/IssueTable";
import { TicketPanel } from "@/components/gov/TicketPanel";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/Skeleton";
import {
  DEFAULT_FILTERS,
  filterReports,
  sortReports,
  type GovFilters,
  type SortKey,
} from "@/lib/filters";
import { logout, useCurrentUser, useReports } from "@/lib/store";
import { cx } from "@/lib/utils";

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
  const { user, hydrated } = useCurrentUser();
  const { reports } = useReports();

  const [view, setView] = useState<"map" | "list">("map");
  const [filters, setFilters] = useState<GovFilters>({ ...DEFAULT_FILTERS });
  const [sort, setSort] = useState<SortKey>("severity");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  // Auth gate.
  useEffect(() => {
    if (hydrated && (!user || user.role !== "government")) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  const visible = useMemo(
    () => sortReports(filterReports(reports, filters), sort),
    [reports, filters, sort]
  );

  const selected = selectedId
    ? reports.find((r) => r.id === selectedId) ?? null
    : null;

  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status !== "resolved");
    return {
      open: open.length,
      critical: open.filter((r) => r.severity >= 8).length,
      inProgress: reports.filter((r) => r.status === "in_progress").length,
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
      {/* Header */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-navy-100 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} markClassName="h-8 w-8" />
          <div>
            <h1 className="text-sm font-bold text-navy-900">
              Operations dashboard
            </h1>
            <p className="text-xs text-ink-muted">{user.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/resolved" className="btn-ghost hidden sm:inline-flex">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Public site
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="btn-outline"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="z-20 flex shrink-0 flex-col gap-3 border-b border-navy-100 bg-white px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <Stat icon={<Inbox className="h-4 w-4" />} label="Open" value={stats.open} tone="navy" />
          <Stat
            icon={<TriangleAlert className="h-4 w-4" />}
            label="Critical"
            value={stats.critical}
            tone="red"
          />
          <Stat
            icon={<Activity className="h-4 w-4" />}
            label="In progress"
            value={stats.inProgress}
            tone="amber"
          />
          <Stat
            icon={<CircleCheck className="h-4 w-4" />}
            label="Resolved"
            value={stats.resolved}
            tone="green"
          />
        </div>

        <div className="flex items-center justify-between gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => setMobileFilters(true)}
            className="btn-outline lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </button>

          <div className="flex items-center gap-2">
            {view === "list" && (
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
                  <option value="severity">Severity</option>
                  <option value="date">Date submitted</option>
                  <option value="category">Category</option>
                  <option value="status">Status</option>
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
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        {/* Filter sidebar (desktop) */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-navy-100 bg-white p-5 lg:block">
          <FilterPanel filters={filters} onChange={setFilters} />
        </aside>

        {/* Main */}
        <main className="relative min-w-0 flex-1">
          {visible.length === 0 ? (
            <div className="grid h-full place-items-center p-6">
              <EmptyState
                icon={<Inbox className="h-6 w-6" />}
                title="No reports match your filters"
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
                reports={visible}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              {/* Map legend */}
              <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-xl border border-navy-100 bg-white/95 p-3 text-xs shadow-card">
                <p className="mb-1.5 font-semibold text-navy-900">
                  Severity ({visible.length} shown)
                </p>
                <div className="flex flex-col gap-1">
                  {[
                    { c: "#16a34a", l: "1–3 Low" },
                    { c: "#eab308", l: "4–6 Moderate" },
                    { c: "#f97316", l: "7–8 High" },
                    { c: "#dc2626", l: "9–10 Critical" },
                  ].map((x) => (
                    <span key={x.l} className="flex items-center gap-2 text-ink-soft">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: x.c }}
                      />
                      {x.l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4 sm:p-6">
              <p className="mb-3 text-sm text-ink-muted">
                {visible.length} report{visible.length === 1 ? "" : "s"} · ranked by{" "}
                {sort}
              </p>
              <IssueTable
                reports={visible}
                selectedId={selectedId}
                onSelect={setSelectedId}
                sort={sort}
                onSortChange={setSort}
              />
            </div>
          )}

          {/* Ticket panel drawer */}
          {selected && (
            <>
              <div
                className="absolute inset-0 z-[500] bg-navy-950/30 lg:hidden"
                onClick={() => setSelectedId(null)}
                aria-hidden="true"
              />
              <div
                className="absolute right-0 top-0 z-[600] h-full w-full max-w-[440px] border-l border-navy-100 bg-white shadow-2xl animate-fade-in"
                role="dialog"
                aria-label={`Ticket ${selected.id} details`}
              >
                <TicketPanel
                  report={selected}
                  authorName={user.displayName}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            </>
          )}
        </main>

        {/* Mobile filters sheet */}
        {mobileFilters && (
          <div className="absolute inset-0 z-[700] lg:hidden">
            <div
              className="absolute inset-0 bg-navy-950/40"
              onClick={() => setMobileFilters(false)}
              aria-hidden="true"
            />
            <div
              className="absolute left-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5 shadow-2xl"
              role="dialog"
              aria-label="Filters"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-navy-900">Filters</span>
                <button
                  type="button"
                  onClick={() => setMobileFilters(false)}
                  className="btn-ghost !p-2"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <FilterPanel filters={filters} onChange={setFilters} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "navy" | "red" | "amber" | "green";
}) {
  const tones = {
    navy: "text-navy-600 bg-navy-50",
    red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50",
    green: "text-emerald-600 bg-emerald-50",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-navy-100 bg-white px-3 py-2">
      <span className={cx("grid h-8 w-8 place-items-center rounded-lg", tones[tone])}>
        {icon}
      </span>
      <div>
        <div className="text-lg font-bold leading-none text-navy-900">
          {value}
        </div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </div>
      </div>
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
