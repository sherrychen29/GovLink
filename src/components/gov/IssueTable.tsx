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
  align?: "left" | "center";
}> = [
  { key: null, label: "TICKET" },
  { key: "category", label: "CATEGORY" },
  { key: "reports", label: "REPORTS", align: "center" },
  { key: "severity", label: "SEVERITY", align: "center" },
  { key: "status", label: "STATUS" },
  { key: "date", label: "SUBMITTED", className: "hidden md:table-cell" },
];

export function IssueTable({
  reports,
  selectedId,
  onSelect,
  sort,
  onSortChange,
  showStatus = true,
}: {
  reports: Report[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sort: SortKey;
  onSortChange: (k: SortKey) => void;
  showStatus?: boolean;
}) {
  const columns = showStatus
    ? COLUMNS
    : COLUMNS.filter((col) => col.key !== "status");
  return (
    <div className="overflow-x-auto rounded-2xl border border-navy-100 bg-white shadow-card">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-navy-100 bg-slate-50/80">
            {columns.map((col) => (
              <th
                key={col.label}
                scope="col"
                className={cx(
                  "px-4 py-3 text-xs font-extrabold uppercase tracking-widest text-navy-600",
                  col.align === "center" && "text-center",
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
                    className={cx(
                      "inline-flex items-center gap-1 hover:text-navy-900",
                      col.align === "center" && "mx-auto"
                    )}
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
                  selected ? "bg-sky-100/70" : "hover:bg-navy-50/50"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* Square image preview */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-navy-100">
                      {(() => {
                        const img = r.media.find((m) => m.kind === "image");
                        return img ? (
                          <img
                            src={img.dataUrl}
                            alt=""
                            className={`h-full w-full object-cover${img.flagged ? " blur-md" : ""}`}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-navy-300" aria-hidden="true" />
                          </div>
                        );
                      })()}
                    </div>
                    {/* Ticket ID + description */}
                    <div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(r.id);
                        }}
                        className="text-left font-mono text-xs font-semibold text-navy-900 hover:text-accent-600"
                      >
                        {r.id}
                      </button>
                      {r.formalTitle && (
                        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-ink-soft">
                          {r.formalTitle}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <CategoryChip category={r.category} size="sm" />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center gap-1 font-semibold text-navy-800">
                    <Users className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
                    {count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center">
                    <SeverityDot severity={r.severity} />
                  </div>
                </td>
                {showStatus && (
                  <td className="px-4 py-3">
                    <StatusPill
                      status={r.status}
                      rejected={!!r.resolution?.rejected}
                      size="sm"
                    />
                  </td>
                )}

                <td className="hidden px-4 py-3 text-navy-700 md:table-cell">
                  {formatDate(r.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
