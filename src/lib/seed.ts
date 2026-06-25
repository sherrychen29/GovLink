// ---------------------------------------------------------------------------
// Seed data so both the citizen and government views look alive on first load.
// Includes varied categories / severities / statuses, a merged (corroborated)
// set, and a rejected-as-resolved example to demo the full pipeline.
// ---------------------------------------------------------------------------

import type {
  Account,
  Category,
  Report,
  ReportStatus,
  Submission,
} from "./types";
import { weightedSeverity } from "./beacon-logic";

export const CITY = {
  name: "Northgate",
  // Real coordinates (downtown grid) so OpenStreetMap tiles render nicely.
  center: { lat: 37.3382, lng: -121.8863 },
  zoom: 14,
};

export const SEED_ACCOUNTS: Account[] = [
  {
    id: "acc_gov",
    username: "government",
    password: "demo",
    role: "government",
    displayName: "Northgate City Operations",
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

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400000).toISOString();
}
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600000).toISOString();
}

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

interface SeedInput {
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
}

function buildReport(s: SeedInput): Report {
  const submissions: Submission[] = [
    {
      id: `sub_${s.id}_0`,
      description: s.description,
      createdAt: s.createdAt,
      contact: {
        name: s.anonymous ? undefined : s.contactName,
        email: s.anonymous ? undefined : s.contactEmail,
        phone: s.anonymous ? undefined : s.contactPhone,
        anonymous: !!s.anonymous,
      },
    },
    ...(s.extraSubmissions || []).map((e, i) => ({
      id: `sub_${s.id}_${i + 1}`,
      description: e.description,
      createdAt: e.createdAt,
      contact: { name: e.name, anonymous: !e.name },
      distanceM: e.distanceM,
    })),
  ];

  const severity = weightedSeverity(s.baseSeverity, submissions.length);

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
    category: s.category,
    description: s.description,
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
      author: "Northgate City Operations",
      createdAt: daysAgo(n.daysAgo),
    })),
    statusHistory,
    resolution: s.resolution,
  };
}

const c = CITY.center;

const SEED_INPUTS: SeedInput[] = [
  // --- Merged / corroborated set: a deep pothole reported by 3 residents -----
  {
    id: "GL-9F4-2207",
    category: "Roads & Sidewalks",
    description:
      "Large, deep pothole in the right lane that's been growing for weeks. Cars are swerving around it into oncoming traffic.",
    lat: c.lat + 0.004,
    lng: c.lng - 0.006,
    address: "1200 Cedar Street",
    crossStreet: "Cedar St & 12th Ave",
    baseSeverity: 6,
    status: "in_progress",
    createdAt: daysAgo(6),
    reporterId: "acc_c1",
    contactName: "Maya Thompson",
    contactEmail: "maya.thompson@gmail.com",
    contactPhone: "(555) 010-2841",
    media: [{ label: "Pothole, Cedar St", from: "#b45309", to: "#78350f" }],
    extraSubmissions: [
      {
        description:
          "Hit this pothole this morning and it nearly blew my tire. It's right before the crosswalk.",
        createdAt: daysAgo(5),
        name: "Daniel Reyes",
        distanceM: 18,
      },
      {
        description:
          "Same pothole — it's now big enough that a bike could go down in it. Please fix before someone gets hurt.",
        createdAt: daysAgo(2),
        name: "Anonymous resident",
        distanceM: 9,
      },
    ],
    internalNotes: [
      { text: "Verified with street cam. Scheduling patch crew for this week.", daysAgo: 4 },
      { text: "Materials ordered. Crew assigned: Patch Team B.", daysAgo: 1 },
    ],
  },
  // --- Rejected-as-resolved example -----------------------------------------
  {
    id: "GL-3K8-5512",
    category: "Noise Complaints",
    description:
      "Neighbor's wind chimes are too loud and I want them removed from their own backyard.",
    lat: c.lat - 0.003,
    lng: c.lng + 0.002,
    address: "44 Birchwood Lane",
    baseSeverity: 2,
    status: "resolved",
    createdAt: daysAgo(9),
    reporterId: "acc_c3",
    contactName: "Aisha Khan",
    contactEmail: "aisha.khan@gmail.com",
    resolution: {
      rejected: true,
      resolvedAt: daysAgo(6),
      note: "Request declined. Personal wind chimes on private property fall below the municipal noise ordinance threshold and aren't enforceable by the city. For disputes between neighbors, please contact community mediation services. Thank you for reaching out.",
    },
  },
  // --- A genuinely resolved (fixed) issue -----------------------------------
  {
    id: "GL-7M2-1043",
    category: "Electricity/Power Lines",
    description:
      "Streetlight has been out for over a week, the whole corner is pitch black at night and feels unsafe near the bus stop.",
    lat: c.lat + 0.001,
    lng: c.lng + 0.0075,
    address: "780 Elm Avenue",
    crossStreet: "Elm Ave & 8th St",
    baseSeverity: 6,
    status: "resolved",
    createdAt: daysAgo(12),
    anonymous: true,
    media: [{ label: "Dark corner, Elm Ave", from: "#1e293b", to: "#0f172a" }],
    resolution: {
      rejected: false,
      resolvedAt: daysAgo(3),
      note: "Replaced the failed photocell and LED fixture. Light is back on and tested. Thanks for flagging the safety concern near the bus stop.",
    },
    internalNotes: [{ text: "Dispatched to utilities. Confirmed fixture failure.", daysAgo: 8 }],
  },
  // --- Downed power line: critical, pulsing on the map ----------------------
  {
    id: "GL-5R9-8830",
    category: "Electricity/Power Lines",
    description:
      "A power line came down across the sidewalk after last night's storm and is partially blocking the path. It's not sparking but people are walking around it.",
    lat: c.lat - 0.0055,
    lng: c.lng - 0.003,
    address: "215 Sycamore Boulevard",
    crossStreet: "Sycamore Blvd & 3rd St",
    baseSeverity: 9,
    status: "opened",
    createdAt: hoursAgo(20),
    reporterId: "acc_c2",
    contactName: "Daniel Reyes",
    contactPhone: "(555) 274-9930",
    media: [{ label: "Downed line", from: "#b91c1c", to: "#7f1d1d" }],
    internalNotes: [{ text: "Escalated to utility company. Cordon requested.", daysAgo: 0 }],
  },
  // --- Water main leak ------------------------------------------------------
  {
    id: "GL-2H7-6691",
    category: "Water/Plumbing",
    description:
      "Water is bubbling up through the street and running down the gutter for two days straight. Looks like a water main leak.",
    lat: c.lat + 0.0062,
    lng: c.lng + 0.001,
    address: "5 Riverside Drive",
    baseSeverity: 7,
    status: "in_progress",
    createdAt: daysAgo(3),
    anonymous: true,
    media: [{ label: "Water in street", from: "#0369a1", to: "#075985" }],
    extraSubmissions: [
      {
        description: "Still leaking, now there's a small sinkhole forming near the curb.",
        createdAt: daysAgo(1),
        name: "Anonymous resident",
        distanceM: 22,
      },
    ],
    internalNotes: [{ text: "Water dept notified. Shutoff scheduled.", daysAgo: 1 }],
  },
  // --- Unsafe playground ----------------------------------------------------
  {
    id: "GL-8C3-4417",
    category: "Parks & Trees",
    description:
      "The big slide at Maple Park playground has a cracked, jagged edge at the bottom. A kid scraped their leg on it yesterday.",
    lat: c.lat - 0.002,
    lng: c.lng - 0.0072,
    address: "Maple Park, 90 Maple Avenue",
    baseSeverity: 6,
    status: "opened",
    createdAt: daysAgo(2),
    reporterId: "acc_c1",
    contactName: "Maya Thompson",
    contactEmail: "maya.thompson@gmail.com",
    media: [{ label: "Cracked slide", from: "#047857", to: "#065f46" }],
  },
  // --- Overflowing trash / illegal dumping ----------------------------------
  {
    id: "GL-4D1-9075",
    category: "Waste & Sanitation",
    description:
      "Someone dumped a couch and several bags of trash next to the public bins. It's been here for days and is attracting pests.",
    lat: c.lat + 0.0025,
    lng: c.lng - 0.0015,
    address: "330 Walnut Street",
    crossStreet: "Walnut St & 4th Ave",
    baseSeverity: 3,
    status: "sent",
    createdAt: hoursAgo(8),
    anonymous: true,
  },
  // --- Dead animal ----------------------------------------------------------
  {
    id: "GL-6T5-3328",
    category: "Animal/Wildlife",
    description:
      "There's a dead raccoon on the side of the road that's been there since the weekend. Starting to smell.",
    lat: c.lat - 0.004,
    lng: c.lng + 0.0058,
    address: "1450 Oakhurst Road",
    baseSeverity: 3,
    status: "sent",
    createdAt: hoursAgo(30),
    reporterId: "acc_c3",
    contactName: "Aisha Khan",
    contactEmail: "aisha.khan@gmail.com",
  },
  // --- Broken traffic signal (public safety) --------------------------------
  {
    id: "GL-1B6-7240",
    category: "Public Safety/Hazards",
    description:
      "The traffic light at this intersection is stuck flashing red in all directions. It's a busy crossing and drivers are confused about who goes.",
    lat: c.lat + 0.0008,
    lng: c.lng - 0.0042,
    address: "Junction of Pine St & Main St",
    crossStreet: "Pine St & Main St",
    baseSeverity: 7,
    status: "in_progress",
    createdAt: daysAgo(1),
    reporterId: "acc_c2",
    contactName: "Daniel Reyes",
    contactPhone: "(555) 274-9930",
    extraSubmissions: [
      {
        description:
          "Light still not working at Pine and Main, almost saw a collision during rush hour.",
        createdAt: hoursAgo(10),
        name: "Anonymous resident",
        distanceM: 14,
      },
    ],
    internalNotes: [{ text: "Signal tech dispatched. Temporary stop signs placed.", daysAgo: 0 }],
  },
  // --- Cracked sidewalk -----------------------------------------------------
  {
    id: "GL-9X2-5560",
    category: "Roads & Sidewalks",
    description:
      "The sidewalk is heaved up by a tree root and it's a real trip hazard, especially for the elderly residents in this block.",
    lat: c.lat - 0.0068,
    lng: c.lng + 0.0032,
    address: "62 Aspen Court",
    baseSeverity: 4,
    status: "sent",
    createdAt: hoursAgo(40),
    anonymous: true,
  },
  // --- Graffiti -------------------------------------------------------------
  {
    id: "GL-3J8-1196",
    category: "Public Safety/Hazards",
    description:
      "Graffiti spray-painted across the underpass wall. Not offensive but it's spreading and looks neglected.",
    lat: c.lat + 0.0048,
    lng: c.lng + 0.0049,
    address: "Northgate Underpass, Harbor Road",
    baseSeverity: 2,
    status: "opened",
    createdAt: daysAgo(4),
    anonymous: true,
  },
];

export function buildSeedReports(): Report[] {
  return SEED_INPUTS.map(buildReport).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
