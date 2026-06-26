// ---------------------------------------------------------------------------
// Shared constants and builders for demo data: city config, demo accounts,
// and the report factory used by sample-reports.ts.
// ---------------------------------------------------------------------------

import type {
  Account,
  Category,
  ChatLogEntry,
  Report,
  ReportStatus,
  ServicePriority,
  Submission,
} from "./types";
import { clamp } from "./beacon-logic";
import { daysAgo } from "./seed-helpers";

export const CITY = {
  name: "San Jose",
  // Real coordinates (downtown grid) so OpenStreetMap tiles render nicely.
  center: { lat: 37.3382, lng: -121.8863 },
  zoom: 14,
};

export const BEACON_GREETING = `Hi, I'm Beacon. Tell me what's going on in the city and roughly where, and I'll turn it into a report for ${CITY.name}. What's the issue?`;

export const SEED_ACCOUNTS: Account[] = [
  {
    id: "acc_gov",
    username: "government",
    password: "demo",
    role: "government",
    displayName: "San Jose City Operations",
  },
  {
    id: "acc_c1",
    username: "citizen1",
    password: "demo",
    role: "citizen",
    displayName: "Maya Thompson",
    email: "maya.thompson@gmail.com",
    phone: "(555) 010-2841",
  },
  {
    id: "acc_c2",
    username: "citizen2",
    password: "demo",
    role: "citizen",
    displayName: "Daniel Reyes",
    email: "daniel.reyes@gmail.com",
    phone: "(555) 274-9930",
  },
  {
    id: "acc_c3",
    username: "citizen3",
    password: "demo",
    role: "citizen",
    displayName: "Aisha Khan",
    email: "aisha.khan@gmail.com",
    phone: "(555) 663-1207",
  },
];

/** A tiny inline SVG "photo" so media thumbnails + the has-media filter work offline. */
function svgPhoto(label: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <g fill="rgba(255,255,255,0.92)" font-family="Inter, sans-serif" text-anchor="middle">
    <text x="200" y="150" font-size="22" font-weight="700">${label}</text>
    <text x="200" y="178" font-size="13" opacity="0.85">Resident photo</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface SeedReportInput {
  id: string;
  category: Category;
  description: string;
  lat: number;
  lng: number;
  address?: string;
  crossStreet?: string;
  baseSeverity: number;
  status: ReportStatus;
  createdAt: string;
  noticedAt?: string;
  reporterId?: string;
  anonymous?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  media?: Array<{ label: string; from: string; to: string }>;
  extraSubmissions?: Array<{
    description: string;
    createdAt: string;
    name?: string;
    distanceM?: number;
  }>;
  internalNotes?: Array<{ text: string; daysAgo: number }>;
  resolution?: { note: string; rejected: boolean; resolvedAt: string };
  chatLog?: ChatLogEntry[];
  formalTitle?: string;
  formalDescription?: string;
  residentDescription?: string;
  servicePriority?: ServicePriority;
}

export function buildReportFromSeed(s: SeedReportInput): Report {
  const residentText = s.residentDescription ?? s.description;
  const submissions: Submission[] = [
    {
      id: `sub_${s.id}_0`,
      description: residentText,
      createdAt: s.createdAt,
      contact: {
        name: s.anonymous ? undefined : s.contactName,
        email: s.anonymous ? undefined : s.contactEmail,
        phone: s.anonymous ? undefined : s.contactPhone,
        anonymous: !!s.anonymous,
      },
      chatLog: s.chatLog,
    },
    ...(s.extraSubmissions || []).map((e, i) => ({
      id: `sub_${s.id}_${i + 1}`,
      description: e.description,
      createdAt: e.createdAt,
      contact: { name: e.name, anonymous: !e.name },
      distanceM: e.distanceM,
    })),
  ];

  const severity = clamp(s.baseSeverity, 1, 10);

  // Build a plausible status history up to the current status.
  const order: ReportStatus[] = ["sent", "opened", "in_progress", "resolved"];
  const upto = order.slice(0, order.indexOf(s.status) + 1);
  const created = new Date(s.createdAt).getTime();
  const statusHistory = upto.map((st, i) => ({
    status: st,
    at:
      st === "resolved" && s.resolution
        ? s.resolution.resolvedAt
        : new Date(created + i * 0.7 * 86400000).toISOString(),
    rejected: st === "resolved" ? s.resolution?.rejected : undefined,
    note: st === "resolved" ? s.resolution?.note : undefined,
  }));

  return {
    id: s.id,
    formalTitle: s.formalTitle,
    category: s.category,
    description: s.formalDescription ?? s.description,
    residentDescription: residentText,
    servicePriority: s.servicePriority,
    location: {
      lat: s.lat,
      lng: s.lng,
      address: s.address,
      crossStreet: s.crossStreet,
      method: s.address ? "address" : "pin",
    },
    media: (s.media || []).map((m, i) => ({
      id: `media_${s.id}_${i}`,
      dataUrl: svgPhoto(m.label, m.from, m.to),
      kind: "image" as const,
      name: `${m.label}.svg`,
    })),
    severity,
    baseSeverity: s.baseSeverity,
    noticedAt: s.noticedAt || s.createdAt,
    createdAt: s.createdAt,
    updatedAt: statusHistory[statusHistory.length - 1].at,
    status: s.status,
    contact: {
      name: s.anonymous ? undefined : s.contactName,
      email: s.anonymous ? undefined : s.contactEmail,
      phone: s.anonymous ? undefined : s.contactPhone,
      anonymous: !!s.anonymous,
    },
    reporterId: s.reporterId,
    submissions,
    internalNotes: (s.internalNotes || []).map((n, i) => ({
      id: `note_${s.id}_${i}`,
      text: n.text,
      author: "San Jose City Operations",
      createdAt: daysAgo(n.daysAgo),
    })),
    statusHistory,
    resolution: s.resolution,
    chatLog: s.chatLog,
  };
}
