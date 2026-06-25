"use client";

import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { CollapsibleFilterBar } from "@/components/CollapsibleFilterBar";
import { CATEGORIES, type Category } from "@/lib/types";
import {
  countResolvedFilters,
  DEFAULT_RESOLVED_FILTERS,
  summarizeResolvedFilters,
  type ResolvedFilters,
  type ResolvedOutcome,
} from "@/lib/resolved-filters";

const OUTCOMES = ["fixed", "declined"] as const satisfies readonly ResolvedOutcome[];

export function ResolvedFilterPanel({
  filters,
  onChange,
}: {
  filters: ResolvedFilters;
  onChange: (f: ResolvedFilters) => void;
}) {
  const active = countResolvedFilters(filters);

  const toggleCategory = (c: Category) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    });

  const toggleOutcome = (o: ResolvedOutcome) =>
    onChange({
      ...filters,
      outcomes: filters.outcomes.includes(o)
        ? filters.outcomes.filter((x) => x !== o)
        : [...filters.outcomes, o],
    });

  return (
    <CollapsibleFilterBar
      activeCount={active}
      summary={summarizeResolvedFilters(filters)}
      onClear={() => onChange({ ...DEFAULT_RESOLVED_FILTERS })}
      className="rounded-xl border border-navy-100 bg-white px-4 py-3 sm:px-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
        <MultiSelectDropdown
          label="Category"
          summaryAll="All categories"
          options={CATEGORIES}
          selected={filters.categories}
          onToggle={toggleCategory}
          getLabel={(c) => c}
          className="w-full sm:w-52"
        />
        <MultiSelectDropdown
          label="Outcome"
          summaryAll="All outcomes"
          options={OUTCOMES}
          selected={filters.outcomes}
          onToggle={toggleOutcome}
          getLabel={(o) => (o === "fixed" ? "Fixed" : "Declined")}
          className="w-full sm:w-44"
        />
      </div>
    </CollapsibleFilterBar>
  );
}
