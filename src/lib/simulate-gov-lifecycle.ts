import type { Category, InternalNote, Report, ReportStatus, StatusEvent } from "./types";
import { corroborations } from "./types";

/** Deterministic pseudo-random in [0, 1) from report id + salt. */
function rand(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(31, h) + id.charCodeAt(i);
    h >>>= 0;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

function addDays(iso: string, days: number, jitterHours = 0): string {
  return addMs(iso, days * 86400000 + jitterHours * 3600000);
}

function daysBetween(a: string, b: Date): number {
  return (b.getTime() - new Date(a).getTime()) / 86400000;
}

const STAFF = [
  "J. Martinez",
  "K. O'Brien",
  "R. Chen",
  "S. Patel",
  "L. Washington",
  "M. Okonkwo",
  "D. Nguyen",
  "A. Brooks",
];

const CATEGORY_PROFILE: Record<
  Category,
  { medianFixDays: number; spread: number; declineBias: number; backlogBias: number }
> = {
  "Public Safety/Hazards": { medianFixDays: 3, spread: 5, declineBias: 0.05, backlogBias: 0.05 },
  "Roads & Sidewalks": { medianFixDays: 19, spread: 22, declineBias: 0.08, backlogBias: 0.16 },
  "Electricity/Power Lines": { medianFixDays: 11, spread: 16, declineBias: 0.11, backlogBias: 0.11 },
  "Water/Plumbing": { medianFixDays: 6, spread: 9, declineBias: 0.06, backlogBias: 0.07 },
  "Waste & Sanitation": { medianFixDays: 5, spread: 8, declineBias: 0.09, backlogBias: 0.06 },
  "Parks & Trees": { medianFixDays: 9, spread: 12, declineBias: 0.07, backlogBias: 0.09 },
  "Animal/Wildlife": { medianFixDays: 2, spread: 4, declineBias: 0.18, backlogBias: 0.04 },
  "Noise Complaints": { medianFixDays: 12, spread: 10, declineBias: 0.42, backlogBias: 0.07 },
  Other: { medianFixDays: 11, spread: 12, declineBias: 0.17, backlogBias: 0.08 },
};

const FIXED_NOTES: Partial<Record<Category, string[]>> = {
  "Roads & Sidewalks": [
    "Crew completed asphalt patch. Lane reopened to traffic.",
    "Sidewalk panel replaced and curb ramp restored to ADA spec.",
    "Pothole filled and area swept. Follow-up inspection scheduled in 30 days.",
  ],
  "Electricity/Power Lines": [
    "Streetlight lamp and ballast replaced. Circuit tested OK.",
    "Utility coordinated repair; pole hardware secured.",
    "Traffic signal timing restored after power-cycle and bulb replacement.",
  ],
  "Water/Plumbing": [
    "Hydrant valve repaired; leak stopped.",
    "Water main break isolated and line replaced. Street flushed.",
    "Storm drain cleared and flow verified during test rain event.",
  ],
  "Waste & Sanitation": [
    "Illegal dumping removed and area posted. Follow-up sweep in 48 hours.",
    "Overflowing bins emptied; additional pickup added to route.",
    "Bulk items hauled. Citation issued where applicable.",
  ],
  "Parks & Trees": [
    "Downed limbs cleared from trail. Path reopened.",
    "Tree trimmed per arborist assessment; debris removed.",
    "Graffiti abated and surface recoated.",
  ],
  "Public Safety/Hazards": [
    "Hazard mitigated on site. Barricades removed after inspection.",
    "Exposed utility access secured. Area safe for pedestrians.",
    "Debris and glass removed from travel lane.",
  ],
  "Animal/Wildlife": [
    "Deceased animal removed from roadway.",
    "Animal services responded; no ongoing public safety concern.",
    "Wildlife relocated per county protocol.",
  ],
  "Noise Complaints": [
    "After-hours activity verified stopped. No further action required.",
    "Noise levels measured within ordinance limits at time of inspection.",
  ],
  Other: [
    "Issue addressed per field inspection notes.",
    "Work completed and verified by supervisor.",
  ],
};

const DECLINE_NOTES: Array<{ test: (ctx: SimContext) => boolean; note: string }> = [
  {
    test: (c) => c.flaggedMedia && c.rand(1) < 0.55,
    note: "Submitted photo does not show the reported condition. Unable to verify issue; request closed without action.",
  },
  {
    test: (c) => c.flaggedMedia,
    note: "Field crew could not confirm the hazard described. Photo evidence was insufficient for dispatch.",
  },
  {
    test: (c) => c.category === "Noise Complaints" && c.rand(2) < 0.45,
    note: "Noise ordinance review: activity occurred within permitted hours. No city enforcement action warranted.",
  },
  {
    test: (c) => c.category === "Noise Complaints",
    note: "Source appears to be private property / non-city equipment. Referred complainant to appropriate agency.",
  },
  {
    test: (c) => c.category === "Animal/Wildlife" && c.rand(3) < 0.35,
    note: "Animal was no longer on site upon arrival. No hazard present at inspection.",
  },
  {
    test: (c) => c.category === "Roads & Sidewalks" && c.rand(4) < 0.2,
    note: "Duplicate of existing work order already scheduled. Linked to parent case and closed.",
  },
  {
    test: (c) => c.severity <= 4 && c.rand(5) < 0.25,
    note: "Site visit found condition already remediated or below threshold for city repair.",
  },
  {
    test: (c) => c.category === "Other" && c.rand(6) < 0.4,
    note: "Issue falls outside city maintenance responsibility. Resident referred to property owner.",
  },
  {
    test: (c) => c.category === "Electricity/Power Lines" && c.flaggedMedia,
    note: "Could not locate reported outage at pinned location. Possible map pin error.",
  },
  {
    test: () => true,
    note: "Inspection found no issue matching the report description. Case closed without repair.",
  },
];

const STUCK_NOTES = [
  "Awaiting PG&E coordination for energized line work.",
  "Asphalt vendor backlog; repair queued for next paving cycle.",
  "Permit hold for tree work near protected root zone.",
  "Parts on order for signal controller module.",
  "Crew assigned; weather delay on scheduled patch.",
  "Escalated to contractor; scope larger than initial assessment.",
];

interface SimContext {
  category: Category;
  severity: number;
  flaggedMedia: boolean;
  corroCount: number;
  ageDays: number;
  rand: (salt: number) => number;
}

function pick<T>(arr: T[], id: string, salt: number): T {
  return arr[Math.floor(rand(id, salt) * arr.length)];
}

function triageDelayHours(ctx: SimContext): number {
  const urgent = ctx.severity >= 8 ? 0.35 : ctx.severity >= 6 ? 0.55 : 1;
  const corroBoost = ctx.corroCount > 1 ? 0.7 : 1;
  return (4 + ctx.rand(10) * 60) * urgent * corroBoost;
}

function fixDurationDays(ctx: SimContext, profile: (typeof CATEGORY_PROFILE)[Category]): number {
  const sevFactor = ctx.severity >= 8 ? 0.6 : ctx.severity <= 3 ? 1.3 : 1;
  const corroFactor = ctx.corroCount > 2 ? 0.8 : 1;
  const noise = (ctx.rand(11) - 0.5) * profile.spread;
  return Math.max(1, Math.round(profile.medianFixDays * sevFactor * corroFactor + noise));
}

function declineProbability(ctx: SimContext): number {
  const p = CATEGORY_PROFILE[ctx.category];
  let score = p.declineBias + ctx.rand(12) * 0.08;
  if (ctx.flaggedMedia) score += 0.32;
  if (ctx.severity <= 3) score += 0.05;
  if (ctx.corroCount > 1) score -= 0.11;
  if (ctx.category === "Public Safety/Hazards" && ctx.severity >= 7) score -= 0.07;
  return Math.max(0.02, Math.min(0.78, score));
}

function buildHistory(
  filedAt: string,
  finalStatus: ReportStatus,
  opts: {
    triageH: number;
    workStartH: number;
    resolvedAt?: string;
    rejected?: boolean;
    resolutionNote?: string;
  }
): StatusEvent[] {
  const events: StatusEvent[] = [{ status: "sent", at: filedAt }];
  if (finalStatus === "sent") return events;

  const openedAt = addMs(filedAt, opts.triageH * 3600000);
  events.push({ status: "opened", at: openedAt });
  if (finalStatus === "opened") return events;

  const progressAt = addMs(openedAt, opts.workStartH * 3600000);
  events.push({ status: "in_progress", at: progressAt });
  if (finalStatus === "in_progress") return events;

  const resolvedAt = opts.resolvedAt ?? addMs(progressAt, 86400000);
  events.push({
    status: "resolved",
    at: resolvedAt,
    rejected: opts.rejected,
    note: opts.resolutionNote,
  });
  return events;
}

function declinedReport(
  report: Report,
  ctx: SimContext,
  filedAt: string,
  triageH: number,
  workStartH: number
): Report {
  const inspectDays = 1.5 + ctx.rand(28) * 8;
  const resolvedAt = addDays(filedAt, inspectDays, ctx.rand(29) * 10);
  const note =
    DECLINE_NOTES.find((d) => d.test(ctx))?.note ??
    "Inspection found no issue matching the report description. Case closed without repair.";
  const history = buildHistory(filedAt, "resolved", {
    triageH,
    workStartH: Math.min(workStartH, inspectDays * 24 * 0.45),
    resolvedAt,
    rejected: true,
    resolutionNote: note,
  });
  return {
    ...report,
    status: "resolved",
    updatedAt: resolvedAt,
    assignedTo: pick(STAFF, report.id, 30),
    statusHistory: history,
    resolution: { note, rejected: true, resolvedAt },
    internalNotes: [
      {
        id: `note_${report.id}_0`,
        text: ctx.flaggedMedia
          ? "Photo flagged at intake; field verification attempted."
          : "Supervisor signed off on closure without repair.",
        author: "San Jose City Operations",
        createdAt: addMs(resolvedAt, -3600000),
      },
    ],
  };
}

function activeReport(
  report: Report,
  ctx: SimContext,
  filedAt: string,
  status: "opened" | "in_progress",
  triageH: number,
  workStartH: number
): Report {
  const history = buildHistory(filedAt, status, { triageH, workStartH });
  const notes: InternalNote[] = [];
  if (status === "in_progress") {
    const stuck = ctx.ageDays > 30 && ctx.rand(33) < 0.55;
    notes.push({
      id: `note_${report.id}_0`,
      text: stuck
        ? pick(STUCK_NOTES, report.id, 35)
        : pick(
            [
              "Crew en route; ETA within 24 hours.",
              "Materials staged; work scheduled this week.",
              "Inspection complete; repair order submitted.",
            ],
            report.id,
            44
          ),
      author: pick(STAFF, report.id, 45),
      createdAt: history[history.length - 1].at,
    });
  }
  return {
    ...report,
    status,
    updatedAt: addDays(history[history.length - 1].at, ctx.rand(46) * 4, 0),
    assignedTo: pick(STAFF, report.id, 47),
    statusHistory: history,
    internalNotes: notes,
  };
}

function resolvedFixedReport(
  report: Report,
  ctx: SimContext,
  filedAt: string,
  triageH: number,
  workStartH: number,
  fixDays: number
): Report {
  const totalDays = triageH / 24 + workStartH / 24 + fixDays;
  const resolvedAt = addDays(filedAt, Math.min(ctx.ageDays * 0.95, totalDays), (ctx.rand(37) - 0.5) * 10);
  const fixNote =
    pick(FIXED_NOTES[report.category] ?? FIXED_NOTES.Other!, report.id, 38) ??
    "Work completed per field inspection.";
  const history = buildHistory(filedAt, "resolved", {
    triageH,
    workStartH,
    resolvedAt,
    rejected: false,
    resolutionNote: fixNote,
  });
  const notes: InternalNote[] = [];
  if (ctx.rand(39) < 0.4) {
    notes.push({
      id: `note_${report.id}_0`,
      text:
        ctx.corroCount > 1
          ? `Corroborated by ${ctx.corroCount} residents; priority bumped.`
          : "Dispatched to field crew.",
      author: pick(STAFF, report.id, 40),
      createdAt: history[1]?.at ?? filedAt,
    });
  }
  return {
    ...report,
    status: "resolved",
    updatedAt: resolvedAt,
    assignedTo: pick(STAFF, report.id, 41),
    statusHistory: history,
    resolution: { note: fixNote, rejected: false, resolvedAt },
    internalNotes: notes,
  };
}

/**
 * Assign realistic government workflow (status, history, resolution, notes)
 * from filing date, category, severity, media flags, and corroboration.
 */
export function simulateGovLifecycle(report: Report, now = new Date()): Report {
  const filedAt = report.createdAt;
  const ageDays = daysBetween(filedAt, now);
  const profile = CATEGORY_PROFILE[report.category];
  const flaggedMedia = report.media.some((m) => m.flagged);
  const corroCount = corroborations(report);

  const ctx: SimContext = {
    category: report.category,
    severity: report.severity,
    flaggedMedia,
    corroCount,
    ageDays,
    rand: (salt) => rand(report.id, salt),
  };

  const triageH = triageDelayHours(ctx);
  const workStartH = 6 + ctx.rand(14) * 72;
  const fixDays = fixDurationDays(ctx, profile);

  // Declined after inspection (checked before other outcomes)
  if (ageDays >= 1.5 && ctx.rand(27) < declineProbability(ctx)) {
    return declinedReport(report, ctx, filedAt, triageH, workStartH);
  }

  // Newest filings — still in queue (data skews ~12–30 days for recent cases)
  if (ageDays <= 13) {
    const r = ctx.rand(20);
    if (r < 0.26) {
      return {
        ...report,
        status: "sent",
        updatedAt: filedAt,
        statusHistory: [{ status: "sent", at: filedAt }],
      };
    }
    if (r < 0.48) {
      return activeReport(report, ctx, filedAt, "opened", triageH, workStartH);
    }
    if (r < 0.88) {
      return activeReport(report, ctx, filedAt, "in_progress", triageH, workStartH);
    }
    return resolvedFixedReport(report, ctx, filedAt, triageH, workStartH, fixDays);
  }

  if (ageDays <= 22) {
    const r = ctx.rand(21);
    if (r < 0.1) {
      return {
        ...report,
        status: "sent",
        updatedAt: filedAt,
        statusHistory: [{ status: "sent", at: filedAt }],
      };
    }
    if (r < 0.32) {
      return activeReport(report, ctx, filedAt, "opened", triageH, workStartH);
    }
    if (r < 0.82) {
      return activeReport(report, ctx, filedAt, "in_progress", triageH, workStartH);
    }
    return resolvedFixedReport(report, ctx, filedAt, triageH, workStartH, fixDays);
  }

  if (ageDays < 35 && ctx.rand(31) < profile.backlogBias + 0.12) {
    return activeReport(report, ctx, filedAt, "in_progress", triageH, workStartH);
  }

  if (ageDays > 35 && ctx.rand(32) < profile.backlogBias) {
    return activeReport(report, ctx, filedAt, "in_progress", triageH, workStartH);
  }

  return resolvedFixedReport(report, ctx, filedAt, triageH, workStartH, fixDays);
}

export function simulateGovLifecycleBatch(reports: Report[], now = new Date()): Report[] {
  return reports.map((r) => simulateGovLifecycle(r, now));
}
