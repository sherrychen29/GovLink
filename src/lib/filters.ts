import type { Category, Report, ReportStatus } from "./types";
import { corroborations } from "./types";

export interface GovFilters {
  statuses: ReportStatus[];
  categories: Category[];
  severityMin: number;
  severityMax: number;
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;
  hasMedia: boolean;
  search: string;
}

export type SortKey = "severity" | "date" | "category" | "status";

export const DEFAULT_FILTERS: GovFilters = {
  statuses: [],
  categories: [],
  severityMin: 1,
  severityMax: 10,
  dateFrom: "",
  dateTo: "",
  hasMedia: false,
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
  const from = f.dateFrom ? new Date(f.dateFrom + "T00:00:00").getTime() : null;
  const to = f.dateTo ? new Date(f.dateTo + "T23:59:59").getTime() : null;

  return reports.filter((r) => {
    if (f.statuses.length && !f.statuses.includes(r.status)) return false;
    if (f.categories.length && !f.categories.includes(r.category)) return false;
    if (r.severity < f.severityMin || r.severity > f.severityMax) return false;
    if (f.hasMedia && r.media.length === 0) return false;
    const created = new Date(r.createdAt).getTime();
    if (from && created < from) return false;
    if (to && created > to) return false;
    if (q) {
      const hay = [
        r.id,
        r.description,
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
    case "severity":
      return arr.sort(
        (a, b) =>
          b.severity - a.severity ||
          corroborations(b) - corroborations(a) ||
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
  if (f.dateFrom || f.dateTo) n++;
  if (f.hasMedia) n++;
  if (f.search.trim()) n++;
  return n;
}
