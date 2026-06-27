"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";

export function CollapsibleFilterBar({
  activeCount,
  summary,
  onClear,
  startExpanded = false,
  children,
  trailing,
  className,
}: {
  activeCount: number;
  summary?: string;
  onClear?: () => void;
  /** When true, filters start expanded (e.g. when filters are already active). */
  startExpanded?: boolean;
  children: ReactNode;
  /** Controls pinned to the header row (e.g. sort + view toggles); stays put when the body expands. */
  trailing?: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(startExpanded || activeCount > 0);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-navy-500" aria-hidden="true" />
          <span className="text-sm font-bold text-navy-900">Filters</span>
          {activeCount > 0 && (
            <span className="chip bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-700">
              {activeCount}
            </span>
          )}
          {!expanded && activeCount > 0 && summary && (
            <span className="truncate text-xs text-ink-muted">{summary}</span>
          )}
          {expanded ? (
            <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          )}
        </button>

        <div className="flex shrink-0 items-center gap-3">
          {activeCount > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ink-muted hover:text-navy-900"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
          {trailing}
        </div>
      </div>

      {expanded && children && <div className="mt-4">{children}</div>}
    </div>
  );
}
