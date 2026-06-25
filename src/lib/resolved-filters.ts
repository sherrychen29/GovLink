import type { Category, Report } from "./types";

export type ResolvedOutcome = "fixed" | "declined";

export interface ResolvedFilters {
  categories: Category[];
  outcomes: ResolvedOutcome[];
}

export const DEFAULT_RESOLVED_FILTERS: ResolvedFilters = {
  categories: [],
  outcomes: ["fixed", "declined"],
};

export function countResolvedFilters(f: ResolvedFilters): number {
  let n = 0;
  if (f.categories.length > 0) n++;
  const isDefault =
    f.outcomes.length === DEFAULT_RESOLVED_FILTERS.outcomes.length &&
    DEFAULT_RESOLVED_FILTERS.outcomes.every((o) => f.outcomes.includes(o));
  if (!isDefault) n++;
  return n;
}

export function summarizeResolvedFilters(f: ResolvedFilters): string {
  const parts: string[] = [];
  if (f.categories.length) parts.push(`${f.categories.length} category`);
  const isDefault =
    f.outcomes.length === DEFAULT_RESOLVED_FILTERS.outcomes.length &&
    DEFAULT_RESOLVED_FILTERS.outcomes.every((o) => f.outcomes.includes(o));
  if (!isDefault) {
    parts.push(
      f.outcomes.length === 0 || f.outcomes.length === 2
        ? "all outcomes"
        : f.outcomes.map((o) => (o === "fixed" ? "Fixed" : "Declined")).join(", ")
    );
  }
  return parts.join(" · ");
}

export function filterResolvedReports(
  reports: Report[],
  f: ResolvedFilters
): Report[] {
  const effectiveOutcomes =
    f.outcomes.length === 0 ? DEFAULT_RESOLVED_FILTERS.outcomes : f.outcomes;

  return reports
    .filter((r) => r.status === "resolved" && r.resolution)
    .filter((r) => {
      const rejected = !!r.resolution?.rejected;
      if (rejected && !effectiveOutcomes.includes("declined")) return false;
      if (!rejected && !effectiveOutcomes.includes("fixed")) return false;
      return true;
    })
    .filter((r) => f.categories.length === 0 || f.categories.includes(r.category))
    .sort(
      (a, b) =>
        new Date(b.resolution!.resolvedAt).getTime() -
        new Date(a.resolution!.resolvedAt).getTime()
    );
}
