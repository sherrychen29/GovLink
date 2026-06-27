// Procedural bulk dataset for analytics stress-testing (~1000 reports, multi-year).

import { weightedSeverity } from "./beacon-logic";
import { CITY } from "./seed";
import {
  STATUS_PIPELINE,
  type Category,
  type Report,
  type ReportStatus,
} from "./types";
import { generateTicketId } from "./utils";

const CATEGORY_WEIGHTS: Array<{ category: Category; weight: number }> = [
  { category: "Roads & Sidewalks", weight: 0.2 },
  { category: "Water/Plumbing", weight: 0.14 },
  { category: "Waste & Sanitation", weight: 0.12 },
  { category: "Electricity/Power Lines", weight: 0.1 },
  { category: "Parks & Trees", weight: 0.1 },
  { category: "Public Safety/Hazards", weight: 0.1 },
  { category: "Noise Complaints", weight: 0.08 },
  { category: "Animal/Wildlife", weight: 0.08 },
  { category: "Other", weight: 0.08 },
];

const DESCRIPTIONS: Record<Category, string[]> = {
  "Roads & Sidewalks": [
    "Large pothole causing vehicles to swerve in the travel lane.",
    "Sidewalk uplift from tree roots creating a trip hazard.",
    "Faded crosswalk markings near a school crossing.",
  ],
  "Water/Plumbing": [
    "Water bubbling up through the pavement for several days.",
    "Broken hydrant leaking steadily onto the sidewalk.",
    "Low water pressure reported on the block after a main break.",
  ],
  "Waste & Sanitation": [
    "Overflowing public trash bins attracting pests.",
    "Illegal dumping of furniture next to a collection point.",
    "Missed pickup — bins full for over a week.",
  ],
  "Electricity/Power Lines": [
    "Streetlight out on a dark corner near a bus stop.",
    "Traffic signal stuck flashing red at a busy intersection.",
    "Downed tree branch resting on utility lines.",
  ],
  "Parks & Trees": [
    "Fallen tree blocking a park trail after a storm.",
    "Broken swing set chain at a neighborhood playground.",
    "Dead tree leaning toward the sidewalk.",
  ],
  "Public Safety/Hazards": [
    "Graffiti covering a public underpass wall.",
    "Missing manhole cover on a residential street.",
    "Damaged guardrail along a curved road segment.",
  ],
  "Noise Complaints": [
    "Construction noise outside permitted hours.",
    "Persistent loud music from a commercial property.",
    "Early-morning leaf blower use in a residential zone.",
  ],
  "Animal/Wildlife": [
    "Dead animal on the roadside needing removal.",
    "Aggressive stray dog reported near a park entrance.",
    "Rodent activity around a restaurant dumpster area.",
  ],
  Other: [
    "General maintenance issue reported by a resident.",
    "Unclear infrastructure problem requiring inspection.",
    "Miscellaneous service request forwarded from 311.",
  ],
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(
  rng: () => number,
  items: T[]
): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function pickCategory(rng: () => number): Category {
  return pickWeighted(rng, CATEGORY_WEIGHTS).category;
}

function pickSeverity(rng: () => number): number {
  const roll = rng();
  if (roll < 0.08) return 9 + Math.floor(rng() * 2);
  if (roll < 0.22) return 7 + Math.floor(rng() * 2);
  if (roll < 0.55) return 4 + Math.floor(rng() * 3);
  return 1 + Math.floor(rng() * 3);
}

function pickStatus(rng: () => number, ageDays: number): ReportStatus {
  if (ageDays < 14) {
    const open: ReportStatus[] = ["sent", "opened", "in_progress"];
    return open[Math.floor(rng() * open.length)];
  }
  if (ageDays < 60) {
    return rng() < 0.55 ? "resolved" : "in_progress";
  }
  return rng() < 0.82 ? "resolved" : "in_progress";
}

function priorityFromSeverity(severity: number) {
  if (severity >= 9) return "Critical" as const;
  if (severity >= 7) return "Elevated" as const;
  if (severity >= 4) return "Standard" as const;
  return "Routine" as const;
}

function randomDate(rng: () => number, start: Date, end: Date): Date {
  const t = start.getTime() + rng() * (end.getTime() - start.getTime());
  return new Date(t);
}

/** ~1000 reports from 2022 through today with realistic category/status spread. */
export function buildBulkSampleReports(count = 1000): Report[] {
  const rng = mulberry32(42);
  const now = new Date();
  const start = new Date(2022, 0, 1);
  const c = CITY.center;
  const reports: Report[] = [];

  for (let i = 0; i < count; i++) {
    const createdAt = randomDate(rng, start, now);
    const ageDays = (now.getTime() - createdAt.getTime()) / 86_400_000;
    const category = pickCategory(rng);
    const baseSeverity = pickSeverity(rng);
    const status = pickStatus(rng, ageDays);
    const submissionCount =
      rng() < 0.18 ? 2 + Math.floor(rng() * 3) : 1;
    const severity = weightedSeverity(baseSeverity, submissionCount);

    const lat = c.lat + (rng() - 0.5) * 0.08;
    const lng = c.lng + (rng() - 0.5) * 0.08;
    const descPool = DESCRIPTIONS[category];
    const description = descPool[Math.floor(rng() * descPool.length)];

    const submissions = Array.from({ length: submissionCount }, (_, si) => ({
      id: `sub_bulk_${i}_${si}`,
      description,
      createdAt: new Date(
        createdAt.getTime() + si * rng() * 3 * 86_400_000
      ).toISOString(),
      contact: { anonymous: rng() < 0.35 },
      distanceM: si > 0 ? Math.round(5 + rng() * 80) : undefined,
    }));

    const order = STATUS_PIPELINE.slice(0, STATUS_PIPELINE.indexOf(status) + 1);
    const statusHistory: Report["statusHistory"] = order.map((st, idx) => ({
      status: st,
      at: new Date(
        createdAt.getTime() + idx * (2 + rng() * 4) * 86_400_000
      ).toISOString(),
    }));

    let resolution: Report["resolution"];
    if (status === "resolved") {
      const resolvedAt = new Date(
        createdAt.getTime() + (3 + rng() * 45) * 86_400_000
      );
      const rejected = rng() < 0.07;
      resolution = {
        rejected,
        resolvedAt: resolvedAt.toISOString(),
        note: rejected
          ? "Request reviewed and declined — outside municipal scope."
          : "Issue verified and closed by city crews.",
      };
      statusHistory[statusHistory.length - 1] = {
        status: "resolved",
        at: resolvedAt.toISOString(),
        rejected,
        note: resolution.note,
      };
    }

    reports.push({
      id: generateTicketId(),
      formalTitle: `${category.split("/")[0]} — bulk sample ${i + 1}`,
      description,
      residentDescription: description,
      servicePriority: priorityFromSeverity(baseSeverity),
      category,
      location: {
        lat,
        lng,
        address: `${100 + Math.floor(rng() * 9000)} Sample St`,
        method: "address",
      },
      media: [],
      severity,
      baseSeverity,
      noticedAt: new Date(
        createdAt.getTime() - rng() * 2 * 86_400_000
      ).toISOString(),
      createdAt: createdAt.toISOString(),
      updatedAt: statusHistory[statusHistory.length - 1].at,
      status,
      contact: { anonymous: rng() < 0.35 },
      submissions,
      internalNotes:
        rng() < 0.12
          ? [
              {
                id: `note_bulk_${i}`,
                text: "Field inspection scheduled.",
                author: "San Jose City Operations",
                createdAt: new Date(
                  createdAt.getTime() + 2 * 86_400_000
                ).toISOString(),
              },
            ]
          : [],
      statusHistory,
      resolution,
    });
  }

  return reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
