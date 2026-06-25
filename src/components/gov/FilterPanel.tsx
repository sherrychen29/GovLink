"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import {
  type GovFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
} from "@/lib/filters";
import { CATEGORIES, STATUS_PIPELINE, type Category, type ReportStatus } from "@/lib/types";
import { STATUS_META, severityMeta } from "@/lib/meta";
import { cx } from "@/lib/utils";

export function FilterPanel({
  filters,
  onChange,
}: {
  filters: GovFilters;
  onChange: (f: GovFilters) => void;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <SlidersHorizontal className="h-4 w-4 text-navy-500" aria-hidden="true" />
          Filters
          {active > 0 && (
            <span className="chip bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-700">
              {active}
            </span>
          )}
        </h2>
        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-navy-900"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label htmlFor="gov-search" className="field-label">
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

      {/* Status */}
      <fieldset>
        <legend className="field-label">Status</legend>
        <div className="flex flex-wrap gap-2">
          {STATUS_PIPELINE.map((s) => {
            const on = filters.statuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStatus(s)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  on
                    ? "bg-navy-900 text-white"
                    : "border border-navy-200 bg-white text-ink-soft hover:border-navy-300"
                )}
              >
                {STATUS_META[s].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Category */}
      <fieldset>
        <legend className="field-label">Category</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = filters.categories.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCategory(c)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  on
                    ? "bg-navy-900 text-white"
                    : "border border-navy-200 bg-white text-ink-soft hover:border-navy-300"
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Severity range */}
      <fieldset>
        <legend className="field-label">
          Severity range
          <span className="ml-2 font-mono text-xs font-normal text-ink-muted">
            {filters.severityMin}–{filters.severityMax}
          </span>
        </legend>
        <div className="space-y-3 pt-1">
          <div>
            <label htmlFor="sev-min" className="mb-1 block text-xs text-ink-muted">
              Minimum
            </label>
            <input
              id="sev-min"
              type="range"
              min={1}
              max={10}
              value={filters.severityMin}
              onChange={(e) =>
                onChange({
                  ...filters,
                  severityMin: Math.min(Number(e.target.value), filters.severityMax),
                })
              }
              className="w-full accent-accent-500"
              style={{ accentColor: severityMeta(filters.severityMin).hex }}
            />
          </div>
          <div>
            <label htmlFor="sev-max" className="mb-1 block text-xs text-ink-muted">
              Maximum
            </label>
            <input
              id="sev-max"
              type="range"
              min={1}
              max={10}
              value={filters.severityMax}
              onChange={(e) =>
                onChange({
                  ...filters,
                  severityMax: Math.max(Number(e.target.value), filters.severityMin),
                })
              }
              className="w-full"
              style={{ accentColor: severityMeta(filters.severityMax).hex }}
            />
          </div>
        </div>
      </fieldset>

      {/* Date range */}
      <fieldset>
        <legend className="field-label">Reported between</legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="date-from" className="sr-only">
              From date
            </label>
            <input
              id="date-from"
              type="date"
              className="field-input !px-2.5 !py-2 text-xs"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="date-to" className="sr-only">
              To date
            </label>
            <input
              id="date-to"
              type="date"
              className="field-input !px-2.5 !py-2 text-xs"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>
      </fieldset>

      {/* Has media */}
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-800">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-navy-300 text-accent-600 focus:ring-accent-400"
          checked={filters.hasMedia}
          onChange={(e) => onChange({ ...filters, hasMedia: e.target.checked })}
        />
        Has photos or video
      </label>
    </div>
  );
}
