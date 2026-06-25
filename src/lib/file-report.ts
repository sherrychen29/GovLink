import type { Report } from "./types";
import {
  createReport,
  mergeSubmission,
  openReports,
  type NewReportInput,
} from "./store";

export interface FileReportResult {
  report: Report;
  merged: boolean;
  distanceM: number | null;
}

/** Formalize, dedupe via Beacon, then persist a new or merged report. */
export async function fileReport(input: NewReportInput): Promise<FileReportResult> {
  let matchId: string | null = null;
  let distanceM: number | null = null;

  try {
    const res = await fetch("/api/beacon/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: {
          category: input.category,
          description: input.description,
          lat: input.location.lat,
          lng: input.location.lng,
        },
        candidates: openReports().map((r) => ({
          id: r.id,
          category: r.category,
          description: r.description,
          lat: r.location.lat,
          lng: r.location.lng,
        })),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      matchId = data.matchId ?? null;
      distanceM = data.distanceM ?? null;
    }
  } catch {
    /* offline — file as new */
  }

  let report: Report | null = null;
  let merged = false;
  if (matchId) {
    report = mergeSubmission(matchId, {
      ...input,
      distanceM: distanceM ?? undefined,
    });
    merged = !!report;
  }
  if (!report) {
    report = createReport(input);
  }

  return { report, merged, distanceM };
}
