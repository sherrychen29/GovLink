import { CATEGORIES, STATUS_PIPELINE, type Report } from "./types";

const DATA_URL = "/data/govlink-reports-500.json";

let cached: Report[] | null = null;

function isReport(value: unknown): value is Report {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.description === "string" &&
    typeof r.category === "string" &&
    CATEGORIES.includes(r.category as Report["category"]) &&
    typeof r.status === "string" &&
    STATUS_PIPELINE.includes(r.status as Report["status"]) &&
    typeof r.severity === "number" &&
    typeof r.baseSeverity === "number" &&
    typeof r.createdAt === "string" &&
    Array.isArray(r.submissions) &&
    (r.submissions as unknown[]).length > 0 &&
    Array.isArray(r.media) &&
    (r.media as unknown[]).length === 0 &&
    Array.isArray(r.statusHistory) &&
    r.location != null &&
    typeof r.location === "object"
  );
}

/** Fetch the curated 500-report analytics dataset from /public/data. */
export async function fetchImported500Reports(): Promise<Report[]> {
  if (cached) return cached;

  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Could not load sample data (${res.status})`);
  }

  const data: unknown = await res.json();
  if (!data || typeof data !== "object" || !("reports" in data)) {
    throw new Error("Sample file must be a JSON object with a reports array");
  }

  const reports = (data as { reports: unknown }).reports;
  if (!Array.isArray(reports)) {
    throw new Error("Sample file reports field must be an array");
  }

  if (reports.length !== 500) {
    throw new Error(`Expected 500 reports, got ${reports.length}`);
  }

  const invalid = reports.find((r) => !isReport(r));
  if (invalid) {
    throw new Error("Sample file contains reports with invalid shape");
  }

  cached = reports as Report[];
  return cached;
}
