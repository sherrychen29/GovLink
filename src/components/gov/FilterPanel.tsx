"use client";

import { Search } from "lucide-react";
import { CollapsibleFilterBar } from "@/components/CollapsibleFilterBar";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import {
  type GovFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  summarizeGovFilters,
} from "@/lib/filters";
import { CATEGORIES, OPEN_STATUS_PIPELINE, type Category, type ReportStatus } from "@/lib/types";
import { STATUS_META, severityMeta } from "@/lib/meta";

export function FilterPanel({
  filters,
  onChange,
  showStatusFilter = true,
}: {
  filters: GovFilters;
  onChange: (f: GovFilters) => void;
  showStatusFilter?: boolean;
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
      activeCount={active}
      summary={summarizeGovFilters(filters)}
      onClear={() => onChange({ ...DEFAULT_FILTERS })}
      startExpanded={active > 0}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
        <div className="w-full shrink-0 lg:max-w-xs">
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

        {showStatusFilter && (
          <MultiSelectDropdown
            label="Status"
            summaryAll="All statuses"
            options={OPEN_STATUS_PIPELINE}
            selected={filters.statuses.filter((s) => s !== "resolved")}
            onToggle={toggleStatus}
            getLabel={(s) => STATUS_META[s].label}
            className="w-full lg:w-44"
          />
        )}

        <MultiSelectDropdown
          label="Category"
          summaryAll="All categories"
          options={CATEGORIES}
          selected={filters.categories}
          onToggle={toggleCategory}
          getLabel={(c) => c}
          className="w-full lg:w-52"
        />

        <fieldset className="min-w-0 flex-1">
          <legend className="field-label">
            Severity
            <span className="ml-2 font-mono text-xs font-normal text-ink-muted">
              {filters.severityMin}–{filters.severityMax}
            </span>
          </legend>
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
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
      </div>
    </CollapsibleFilterBar>
  );
}
