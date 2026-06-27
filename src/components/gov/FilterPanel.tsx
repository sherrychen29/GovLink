"use client";

import { Search, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { CollapsibleFilterBar } from "@/components/CollapsibleFilterBar";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import {
  type GovFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  summarizeGovFilters,
} from "@/lib/filters";
import { CATEGORIES, OPEN_STATUS_PIPELINE, type Category, type ReportStatus } from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { SeverityRangeSlider } from "@/components/gov/SeverityRangeSlider";

const GOV_FILTER_LABEL = "gov-filter-label";

export function FilterPanel({
  filters,
  onChange,
  showStatusFilter = true,
  trailing,
  sortSlot,
}: {
  filters: GovFilters;
  onChange: (f: GovFilters) => void;
  showStatusFilter?: boolean;
  trailing?: ReactNode;
  sortSlot?: ReactNode;
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
      </div>
    </CollapsibleFilterBar>
  );
}
