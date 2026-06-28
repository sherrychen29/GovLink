"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpDown, ChevronDown, X } from "lucide-react";
import type { ReactNode } from "react";
import { CollapsibleFilterBar } from "@/components/CollapsibleFilterBar";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import {
  type GovFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  summarizeGovFilters,
  type SortKey,
} from "@/lib/filters";
import { CATEGORIES, OPEN_STATUS_PIPELINE, type Category, type ReportStatus } from "@/lib/types";
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
}: {
  filters: GovFilters;
  onChange: (f: GovFilters) => void;
  showStatusFilter?: boolean;
  trailing?: ReactNode;
  sort?: SortKey;
  onSortChange?: (s: SortKey) => void;
  showSort?: boolean;
}) {
  const active = countActiveFilters(filters);

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
    <CollapsibleFilterBar
      variant="gov"
      activeCount={active}
      summary={summarizeGovFilters(filters)}
      onClear={() => onChange({ ...DEFAULT_FILTERS })}
      startExpanded={active > 0}
      trailing={trailing}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
        <div className="w-full shrink-0 lg:max-w-xs">
          <label htmlFor="gov-search" className={GOV_FILTER_LABEL}>
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400"
              aria-hidden="true"
            />
            <input
              id="gov-search"
              className="field-input pl-9"
              placeholder="ID, keyword, street…"
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
            className="w-full lg:w-44"
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
          className="w-full lg:w-52"
        />

        <fieldset className="w-full shrink-0 lg:w-52">
          <legend className={GOV_FILTER_LABEL}>Severity</legend>
          <SeverityRangeSlider
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
      </div>
    </CollapsibleFilterBar>
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
    <div ref={ref} className="relative w-full shrink-0 lg:w-auto">
      <span className={GOV_FILTER_LABEL}>Sort</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field-input flex w-full items-center justify-between gap-2 text-left text-sm"
      >
        <span className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-navy-500" aria-hidden="true" />
          <span>{current}</span>
        </span>
        <ChevronDown
          className={cx("h-4 w-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")}
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
