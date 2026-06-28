import type { Category, Report, ReportStatus } from "./types";
import { corroborations } from "./types";

export interface GovFilters {
  statuses: ReportStatus[];
  categories: Category[];
  severityMin: number;
  severityMax: number;
  search: string;
}

export type SortKey = "reports" | "severity" | "date" | "category" | "status";

export const DEFAULT_FILTERS: GovFilters = {
  statuses: [],
  categories: [],
  severityMin: 1,
  severityMax: 10,
  search: "",
};

const STATUS_ORDER: Record<ReportStatus, number> = {
  sent: 0,
  opened: 1,
  in_progress: 2,
  resolved: 3,
};

export function filterReports(reports: Report[], f: GovFilters): Report[] {
  const q = f.search.trim().toLowerCase();

  return reports.filter((r) => {
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (f.categories.length && !f.categories.includes(r.category)) return false;
    if (r.severity < f.severityMin || r.severity > f.severityMax) return false;
    if (q) {
      const hay = [
        r.id,
        r.description,
        r.formalTitle,
        r.category,
        r.location.address,
        r.location.crossStreet,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortReports(reports: Report[], key: SortKey): Report[] {
  const arr = [...reports];
  switch (key) {
    case "reports":
      return arr.sort(
        (a, b) =>
          corroborations(b) - corroborations(a) ||
          b.severity - a.severity ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "severity":
      return arr.sort(
        (a, b) =>
          b.severity - a.severity ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "date":
      return arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "category":
      return arr.sort((a, b) => a.category.localeCompare(b.category));
    case "status":
      return arr.sort(
        (a, b) =>
          STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
          b.severity - a.severity
      );
    default:
      return arr;
  }
}

export function countActiveFilters(f: GovFilters): number {
  let n = 0;
  if (f.statuses.length) n++;
  if (f.categories.length) n++;
  if (f.severityMin !== 1 || f.severityMax !== 10) n++;
  if (f.search.trim()) n++;
  return n;
}

export function summarizeGovFilters(f: GovFilters): string {
  const parts: string[] = [];
  if (f.search.trim()) parts.push(`"${f.search.trim()}"`);
  if (f.statuses.length) parts.push(`${f.statuses.length} status`);
  if (f.categories.length) parts.push(`${f.categories.length} category`);
  if (f.severityMin !== 1 || f.severityMax !== 10) {
    parts.push(`sev ${f.severityMin}–${f.severityMax}`);
  }
  return parts.join(" · ");
}
