"use client";

import { ArrowUpDown, ArrowDown, Users, ImageIcon } from "lucide-react";
import type { Report } from "@/lib/types";
import { corroborations } from "@/lib/types";
import type { SortKey } from "@/lib/filters";
import { CategoryChip } from "@/components/Chips";
import { StatusPill } from "@/components/StatusPill";
import { SeverityDot } from "@/components/Severity";
import { cx, formatDate } from "@/lib/utils";

const COLUMNS: Array<{
  key: SortKey | null;
  label: string;
  className?: string;
}> = [
  { key: null, label: "Ticket" },
  { key: "category", label: "Category" },
  { key: null, label: "Location", className: "hidden lg:table-cell" },
  { key: "severity", label: "Severity" },
  { key: "status", label: "Status" },
  { key: "date", label: "Submitted", className: "hidden md:table-cell" },
  { key: null, label: "Assigned", className: "hidden xl:table-cell" },
];

export function IssueTable({
  reports,
  selectedId,
  onSelect,
  sort,
  onSortChange,
}: {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sort: SortKey;
  onSortChange: (k: SortKey) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white shadow-card">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-slate-50/80">
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={cx(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted",
                  col.className
                )}
                aria-sort={
                  col.key && sort === col.key ? "descending" : undefined
                }
              >
                {col.key ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(col.key as SortKey)}
                    className="inline-flex items-center gap-1 hover:text-navy-900"
                  >
                    {col.label}
                    {sort === col.key ? (
                      <ArrowDown className="h-3.5 w-3.5 text-accent-600" aria-hidden="true" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const count = corroborations(r);
            const selected = selectedId === r.id;
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={cx(
                  "cursor-pointer border-b border-navy-50 transition-colors last:border-0",
                  selected ? "bg-accent-50/60" : "hover:bg-navy-50/50"
                )}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(r.id);
                    }}
                    className="font-mono text-xs font-semibold text-navy-900 hover:text-accent-600"
                  >
                    {r.id}
                  </button>
                  <div className="mt-1 flex items-center gap-1.5">
                    {count >= 2 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent-700">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {count}
                      </span>
                    )}
                    {r.media.length > 0 && (
                      <ImageIcon className="h-3 w-3 text-ink-muted" aria-label="Has media" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategoryChip category={r.category} size="sm" />
                </td>
                <td className="hidden max-w-[200px] px-4 py-3 text-ink-soft lg:table-cell">
                  <span className="block truncate">
                    {r.location.address ||
                      r.location.crossStreet ||
                      `${r.location.lat.toFixed(4)}, ${r.location.lng.toFixed(4)}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SeverityDot severity={r.severity} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={r.status}
                    rejected={!!r.resolution?.rejected}
                    size="sm"
                  />
                </td>
                <td className="hidden px-4 py-3 text-ink-muted md:table-cell">
                  {formatDate(r.createdAt)}
                </td>
                <td className="hidden px-4 py-3 text-ink-muted xl:table-cell">
                  <span className="text-xs italic text-navy-300">Unassigned</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
