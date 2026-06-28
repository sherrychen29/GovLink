"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpDown, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import {
  type GovFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  type SortKey,
} from "@/lib/filters";
import { CATEGORIES, OPEN_STATUS_PIPELINE, type Category, type ReportStatus } from "@/lib/types";
import type { ResolvedOutcome } from "@/lib/resolved-filters";
import { STATUS_META } from "@/lib/meta";
import { SeverityRangeSlider } from "@/components/gov/SeverityRangeSlider";
import { cx } from "@/lib/utils";

const GOV_FILTER_LABEL = "gov-filter-label";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "reports", label: "# of reports" },
  { value: "severity", label: "Severity" },
  { value: "date", label: "Date submitted" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
];

export function FilterPanel({
  filters,
  onChange,
  showStatusFilter = true,
  trailing,
  sort,
  onSortChange,
  showSort = false,
  resolvedOutcome,
  onResolvedOutcomeChange,
}: {
  filters: GovFilters;
  onChange: (f: GovFilters) => void;
  showStatusFilter?: boolean;
  trailing?: ReactNode;
  sort?: SortKey;
  onSortChange?: (s: SortKey) => void;
  showSort?: boolean;
  resolvedOutcome?: "all" | ResolvedOutcome;
  onResolvedOutcomeChange?: (o: "all" | ResolvedOutcome) => void;
}) {
  const active = countActiveFilters(filters);
  const outcomeActive = resolvedOutcome != null && resolvedOutcome !== "all";

  const toggleStatus = (s: ReportStatus) =>
    onChange({
      ...filters,
      statuses: filters.statuses.includes(s)
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s],
    });

  const toggleCategory = (c: Category) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });

  return (
    <div className="gov-filter-bar w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
        <div className="w-full shrink-0 sm:max-w-[11rem]">
          <label htmlFor="gov-search" className={GOV_FILTER_LABEL}>
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-navy-400"
              aria-hidden="true"
            />
            <input
              id="gov-search"
              className="field-input pl-8"
              placeholder="ID, keyword…"
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {showStatusFilter && (
          <MultiSelectDropdown
            label="Status"
            labelClassName={GOV_FILTER_LABEL}
            summaryAll="All"
            options={OPEN_STATUS_PIPELINE}
            selected={filters.statuses.filter((s) => s !== "resolved")}
            onToggle={toggleStatus}
            getLabel={(s) => STATUS_META[s].label}
            className="w-full sm:w-36"
          />
        )}

        {resolvedOutcome != null && onResolvedOutcomeChange && (
          <ResolvedOutcomeToggle
            value={resolvedOutcome}
            onChange={onResolvedOutcomeChange}
          />
        )}

        <MultiSelectDropdown
          label="Category"
          labelClassName={GOV_FILTER_LABEL}
          summaryAll="All"
          options={CATEGORIES}
          selected={filters.categories}
          onToggle={toggleCategory}
          getLabel={(c) => c}
          className="w-full sm:w-40"
        />

        <fieldset className="w-full shrink-0 sm:w-44">
          <legend className={GOV_FILTER_LABEL}>Severity</legend>
          <SeverityRangeSlider
            className="gov-severity-slider"
            min={filters.severityMin}
            max={filters.severityMax}
            onChange={({ min, max }) =>
              onChange({
                ...filters,
                severityMin: min,
                severityMax: max,
              })
            }
          />
        </fieldset>

        {showSort && sort !== undefined && onSortChange && (
          <SortDropdown
            value={sort}
            onChange={onSortChange}
            showStatus={showStatusFilter}
          />
        )}

        {(active > 0 || outcomeActive) && (
          <div className="flex items-end pb-0.5 sm:ml-auto">
            <button
              type="button"
              onClick={() => {
                onChange({ ...DEFAULT_FILTERS });
                onResolvedOutcomeChange?.("all");
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-navy-900"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Clear
            </button>
          </div>
        )}

        {trailing}
      </div>
    </div>
  );
}

/** Bare filter controls — no collapsible wrapper. Used by the map overlay. */
export function MapFilterContent({
  filters,
  onChange,
}: {
  filters: GovFilters;
  onChange: (f: GovFilters) => void;
}) {
  const active = countActiveFilters(filters);

  const toggleCategory = (c: Category) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });

  return (
    <div className="flex flex-col gap-4">
      {active > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-navy-900"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        </div>
      )}
      <div>
        <label htmlFor="map-gov-search" className={GOV_FILTER_LABEL}>
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
            aria-hidden="true"
          />
          <input
            id="map-gov-search"
            className="field-input pl-9"
            placeholder="ID, keyword, street…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
      </div>
      <MultiSelectDropdown
        label="Category"
        labelClassName={GOV_FILTER_LABEL}
        summaryAll="All"
        options={CATEGORIES}
        selected={filters.categories}
        onToggle={toggleCategory}
        getLabel={(c) => c}
        className="w-full"
      />
      <fieldset>
        <legend className={GOV_FILTER_LABEL}>Severity</legend>
        <SeverityRangeSlider
          min={filters.severityMin}
          max={filters.severityMax}
          onChange={({ min, max }) =>
            onChange({ ...filters, severityMin: min, severityMax: max })
          }
        />
      </fieldset>
    </div>
  );
}

const OUTCOME_OPTIONS: { value: "all" | ResolvedOutcome; label: string }[] = [
  { value: "all", label: "All" },
  { value: "fixed", label: "Solved" },
  { value: "declined", label: "Cancelled" },
];

function ResolvedOutcomeToggle({
  value,
  onChange,
}: {
  value: "all" | ResolvedOutcome;
  onChange: (o: "all" | ResolvedOutcome) => void;
}) {
  return (
    <fieldset className="w-full shrink-0 lg:w-auto">
      <legend className={GOV_FILTER_LABEL}>Outcome</legend>
      <div
        className="inline-flex gap-0.5 rounded-md border border-navy-200 bg-navy-50/50 p-0.5"
        role="radiogroup"
        aria-label="Filter by closure outcome"
      >
        {OUTCOME_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={cx(
                "rounded px-2 py-1 text-xs font-semibold transition-colors",
                selected
                  ? opt.value === "declined"
                    ? "bg-red-600 text-white shadow-sm"
                    : opt.value === "fixed"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-navy-900 text-white shadow-sm"
                  : "text-navy-700 hover:bg-white hover:text-navy-900"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SortDropdown({
  value,
  onChange,
  showStatus,
}: {
  value: SortKey;
  onChange: (s: SortKey) => void;
  showStatus: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const options = showStatus ? SORT_OPTIONS : SORT_OPTIONS.filter((o) => o.value !== "status");
  const current = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative w-full shrink-0 sm:w-36">
      <span className={GOV_FILTER_LABEL}>Sort</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field-input flex w-full items-center justify-between gap-1.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-navy-500" aria-hidden="true" />
          <span className="truncate">{current}</span>
        </span>
        <ChevronDown
          className={cx("h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Sort by"
          className="absolute z-50 mt-1 w-full min-w-[11rem] overflow-hidden rounded-lg border border-navy-200 bg-white py-1 shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cx(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-navy-50",
                opt.value === value ? "bg-navy-50/80 font-medium text-navy-900" : "text-navy-700"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
