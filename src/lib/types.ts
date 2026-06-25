// ---------------------------------------------------------------------------
// GovLink core domain types — shared by the citizen app, gov dashboard,
// the data layer, and the Beacon API routes.
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  "Water/Plumbing",
  "Roads & Sidewalks",
  "Electricity/Power Lines",
  "Waste & Sanitation",
  "Parks & Trees",
  "Noise Complaints",
  "Animal/Wildlife",
  "Public Safety/Hazards",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type ReportStatus = "sent" | "opened" | "in_progress" | "resolved";

export const STATUS_PIPELINE: ReportStatus[] = [
  "sent",
  "opened",
  "in_progress",
  "resolved",
];

export type LocationMethod = "gps" | "pin" | "cross-street" | "address";

export interface ReportLocation {
  lat: number;
  lng: number;
  address?: string;
  crossStreet?: string;
  method: LocationMethod;
}

export interface MediaItem {
  id: string;
  /** Data URL (base64) so the prototype survives a refresh via localStorage. */
  dataUrl: string;
  kind: "image" | "video";
  name?: string;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  anonymous: boolean;
}

/** One citizen submission folded into a report (originals + corroborations). */
export interface Submission {
  id: string;
  description: string;
  createdAt: string; // ISO
  contact?: ContactInfo;
  /** Approx. distance in metres from the canonical report location, if merged. */
  distanceM?: number;
}

export interface InternalNote {
  id: string;
  text: string;
  author: string;
  createdAt: string; // ISO
}

export interface StatusEvent {
  status: ReportStatus;
  at: string; // ISO
  note?: string;
  /** True when this resolution was a rejection (status still reads "resolved"). */
  rejected?: boolean;
}

export interface Report {
  id: string; // tracking ID, e.g. "GL-7K2-4810"
  category: Category;
  description: string;
  location: ReportLocation;
  media: MediaItem[];
  /** Final severity 1–10 (AI judgement, weighted upward by corroborations). */
  severity: number;
  /** Beacon's base severity from the description alone, before corroboration weighting. */
  baseSeverity: number;
  noticedAt: string; // ISO — auto-filled, editable
  createdAt: string; // ISO
  updatedAt: string; // ISO
  status: ReportStatus;
  contact: ContactInfo;
  /** Account id of the reporter, when filed while logged in. */
  reporterId?: string;
  /** Every submission that makes up this report (length === corroborations). */
  submissions: Submission[];
  internalNotes: InternalNote[];
  statusHistory: StatusEvent[];
  /** Citizen-visible resolution note (includes rejection reason when rejected). */
  resolution?: {
    note: string;
    rejected: boolean;
    resolvedAt: string;
  };
}

export interface Account {
  id: string;
  username: string;
  password: string; // demo only — never do this in production
  role: "citizen" | "government";
  displayName: string;
  email?: string;
  phone?: string;
}

/** The number of distinct residents who reported an issue. */
export function corroborations(report: Report): number {
  return Math.max(1, report.submissions.length);
}
