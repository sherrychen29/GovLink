"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";
import { cx } from "@/lib/utils";

export function CollapsibleFilterBar({
  activeCount,
  summary,
  onClear,
  startExpanded = false,
  children,
  trailing,
  className,
  variant = "default",
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
  variant?: "default" | "gov";
}) {
  const [expanded, setExpanded] = useState(startExpanded || activeCount > 0);
  const isGov = variant === "gov";

  return (
    <div className={cx(isGov && "w-full bg-white", className)}>
      <div className={cx("flex items-center gap-3", isGov ? "w-full" : "justify-between")}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cx(
            "flex min-w-0 items-center gap-2.5 text-left transition-colors",
            isGov
              ? "w-full border-b border-navy-200 bg-white px-1 py-3 hover:border-navy-400"
              : "flex-1 rounded-md border border-navy-200 px-3 py-1.5 hover:border-navy-400"
          )}
          aria-expanded={expanded}
        >
          <SlidersHorizontal
            className={cx(
              "shrink-0 text-navy-500",
              isGov ? "h-5 w-5" : "h-4 w-4"
            )}
            aria-hidden="true"
          />
          <span className={cx("font-bold text-navy-900", isGov ? "text-base" : "text-sm")}>
            Filters
          </span>
          {activeCount > 0 && (
            <span className="chip bg-accent-100 px-2 py-0.5 text-[11px] font-bold text-accent-700">
              {activeCount}
            </span>
          )}
          {!expanded && activeCount > 0 && summary && (
            <span className={cx("truncate text-ink-muted", isGov ? "text-sm" : "text-xs")}>
              {summary}
            </span>
          )}
          {expanded ? (
            <ChevronUp
              className={cx(
                "ml-auto shrink-0 text-ink-muted",
                isGov ? "h-5 w-5" : "h-4 w-4"
              )}
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              className={cx(
                "ml-auto shrink-0 text-ink-muted",
                isGov ? "h-5 w-5" : "h-4 w-4"
              )}
              aria-hidden="true"
            />
          )}
        </button>

        {!isGov && (
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
        )}
      </div>

      {isGov && activeCount > 0 && onClear && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-navy-900"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>
      )}

      {expanded && children && (
        <div className={cx(isGov ? "mt-4 w-full bg-white pb-1" : "mt-4")}>{children}</div>
      )}
    </div>
  );
}
